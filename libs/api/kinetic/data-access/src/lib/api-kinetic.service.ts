import { ApiCoreService, AppEnvironment } from '@kin-kinetic/api/core/data-access'
import { createReference, ellipsify, parseAppKey } from '@kin-kinetic/api/core/util'
import { parseTransactionError } from '@kin-kinetic/api/kinetic/util'
import { ApiSolanaService } from '@kin-kinetic/api/solana/data-access'
import { ApiWebhookService, WebhookType } from '@kin-kinetic/api/webhook/data-access'
import { Keypair } from '@kin-kinetic/keypair'
import { PublicKey } from '@solana/web3.js'
import {
  BalanceMint,
  Commitment,
  generateCloseAccountTransaction,
  MintAccounts,
  PublicKeyString,
  removeDecimals,
  Solana,
} from '@kin-kinetic/solana'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common'
import { Counter } from '@opentelemetry/api-metrics'
import { App, AppEnv, Prisma, Transaction, TransactionErrorType, TransactionStatus } from '@prisma/client'
import { Transaction as SolanaTransaction, VersionedTransaction, AddressLookupTableAccount } from '@solana/web3.js'
import { Request } from 'express'
import * as requestIp from 'request-ip'
import { CloseAccountRequest } from './dto/close-account-request.dto'
import { AccountInfo } from './entities/account.info'
import { GetTransactionResponse } from './entities/get-transaction-response.entity'
import { HistoryResponse } from './entities/history-response.entity'
import { LatestBlockhashResponse } from './entities/latest-blockhash-response.entity'
import { MinimumRentExemptionBalanceRequest } from './entities/minimum-rent-exemption-balance-request.dto'
import { MinimumRentExemptionBalanceResponse } from './entities/minimum-rent-exemption-balance-response.entity'
import { SignatureStatus } from './entities/signature-status.entity'
import { validateCloseAccount } from './helpers/validate-close.account'
import { ProcessTransactionOptions } from './interfaces/process-transaction-options'
import { TransactionWithErrors } from './interfaces/transaction-with-errors'

@Injectable()
export class ApiKineticService implements OnModuleInit {
  private logger = new Logger(ApiKineticService.name)

  private closeAccountRequestCounter: Counter
  private closeAccountRequestInvalidCounter: Counter
  private closeAccountRequestValidCounter: Counter
  private confirmSignatureFinalizedCounter: Counter
  private confirmTransactionSolanaConfirmedCounter: Counter
  private mintNotFoundErrorCounter: Counter
  private sendEventWebhookErrorCounter: Counter
  private sendEventWebhookSuccessCounter: Counter
  private sendSolanaTransactionConfirmedCounter: Counter
  private sendSolanaTransactionErrorCounter: Counter
  private sendVerifyWebhookErrorCounter: Counter
  private sendVerifyWebhookSuccessCounter: Counter

  constructor(
    private readonly core: ApiCoreService,
    private readonly solana: ApiSolanaService,
    private readonly webhook: ApiWebhookService,
  ) {}

  onModuleInit() {
    this.closeAccountRequestCounter = this.core.metrics.getCounter(`api_account_close_account_request`, {
      description: 'Number of closeAccount requests',
    })
    this.closeAccountRequestInvalidCounter = this.core.metrics.getCounter(`api_account_close_account_invalid_request`, {
      description: 'Number of invalid closeAccount requests',
    })
    this.closeAccountRequestValidCounter = this.core.metrics.getCounter(`api_account_close_account_valid_request`, {
      description: 'Number of valid closeAccount requests',
    })
    this.confirmSignatureFinalizedCounter = this.core.metrics.getCounter(
      `api_kinetic_confirm_signature_finalized_counter`,
      { description: 'Number of makeTransfer finalized Solana transactions' },
    )
    this.confirmTransactionSolanaConfirmedCounter = this.core.metrics.getCounter(
      `api_kinetic_confirm_transaction_solana_confirmed_counter`,
      { description: 'Number of makeTransfer committed Solana transactions' },
    )
    this.mintNotFoundErrorCounter = this.core.metrics.getCounter(`api_kinetic_mint_not_found_error_counter`, {
      description: 'Number of makeTransfer mint not found errors',
    })

    this.sendEventWebhookErrorCounter = this.core.metrics.getCounter(`api_kinetic_send_event_webhook_error_counter`, {
      description: 'Number of makeTransfer webhook event errors',
    })
    this.sendEventWebhookSuccessCounter = this.core.metrics.getCounter(
      `api_kinetic_send_event_webhook_success_counter`,
      { description: 'Number of makeTransfer webhook event success' },
    )
    this.sendSolanaTransactionConfirmedCounter = this.core.metrics.getCounter(
      `api_kinetic_send_solana_transaction_confirmed_counter`,
      { description: 'Number of makeTransfer confirmed Solana transactions' },
    )
    this.sendSolanaTransactionErrorCounter = this.core.metrics.getCounter(
      `api_kinetic_send_solana_transaction_error_counter`,
      { description: 'Number of makeTransfer Solana errors' },
    )
    this.sendVerifyWebhookErrorCounter = this.core.metrics.getCounter(`api_kinetic_send_verify_webhook_error_counter`, {
      description: 'Number of makeTransfer webhook verify errors',
    })
    this.sendVerifyWebhookSuccessCounter = this.core.metrics.getCounter(
      `api_kinetic_send_verify_webhook_success_counter`,
      { description: 'Number of makeTransfer webhook verify success' },
    )
  }

  createAppEnvTransaction(appEnvId: string, options: Prisma.TransactionCreateInput): Promise<TransactionWithErrors> {
    return this.core.transaction.create({
      data: {
        appEnv: { connect: { id: appEnvId } },
        ...options,
      },
      include: { errors: true },
    })
  }

  async confirmSignature({
    appEnv,
    appKey,
    transactionId,
    blockhash,
    headers,
    lastValidBlockHeight,
    signature,
    solanaStart,
    transactionStart,
    isVersioned,
  }: {
    appEnv: AppEnv & { app: App }
    appKey: string
    transactionId: string
    blockhash: string
    headers?: Record<string, string>
    lastValidBlockHeight: number
    signature: string
    solanaStart: Date
    transactionStart: Date
    isVersioned?: boolean
  }): Promise<Transaction | undefined> {
    const solana = await this.getSolanaConnection(appKey)
    this.logger.verbose(`${appKey}: confirmSignature: confirming ${signature} ${isVersioned ? '(versioned)' : ''}`)

    const finalized = await solana.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature: signature as string,
      },
      Commitment.Finalized,
    )
    if (finalized) {
      // For versioned transactions, specify the max supported version
      const solanaTransaction = await solana.connection.getParsedTransaction(
        signature,
        {
          commitment: 'finalized',
          maxSupportedTransactionVersion: isVersioned ? 0 : undefined
        }
      );

      const transaction = await this.storeFinalizedTransaction(
        appKey,
        transactionId,
        signature,
        solanaStart,
        transactionStart,
        solanaTransaction,
        isVersioned
      )

      this.confirmSignatureFinalizedCounter.add(1, { appKey })
      // Send Event Webhook
      if (appEnv.webhookEventEnabled && appEnv.webhookEventUrl && transaction) {
        const eventWebhookTransaction = await this.sendEventWebhook(appKey, appEnv, transaction, headers)
        if (eventWebhookTransaction.status === TransactionStatus.Failed) {
          this.logger.error(
            `Transaction ${transaction.id} sendEventWebhook failed:${eventWebhookTransaction.errors
              .map((e) => e.message)
              .join(', ')}`,
            eventWebhookTransaction.errors,
          )
          return eventWebhookTransaction
        }
      }

      this.logger.verbose(`${appKey}: confirmSignature: finished ${signature}`)
      return transaction
    }
  }

  storeFinalizedTransaction(
    appKey: string,
    transactionId: string,
    signature: string,
    solanaStart: Date,
    transactionStart: Date,
    solanaTransaction: unknown,
    isVersioned?: boolean
  ) {
    const solanaFinalized = new Date()
    const solanaFinalizedDuration = solanaFinalized.getTime() - solanaStart.getTime()
    const totalDuration = solanaFinalized.getTime() - transactionStart.getTime()
    this.logger.verbose(`${appKey}: storeFinalizedTransaction: ${Commitment.Finalized} ${signature} ${isVersioned ? '(versioned)' : ''}`)

    return this.updateTransaction(transactionId, {
      solanaFinalized,
      solanaFinalizedDuration,
      solanaTransaction: solanaTransaction ? JSON.parse(JSON.stringify(solanaTransaction)) : undefined,
      status: TransactionStatus.Finalized,
      totalDuration,
      isVersioned, // Store whether this was a versioned transaction
    })
  }

  deleteSolanaConnection(appKey: string): void {
    return this.solana.deleteConnection(appKey)
  }

  async getAccountInfo(
    appKey: string,
    account: PublicKeyString,
    mint: PublicKeyString,
    commitment: Commitment,
  ): Promise<AccountInfo> {
    const solana = await this.getSolanaConnection(appKey)
    const accountInfo = await solana.getParsedAccountInfo(account, commitment)

    const parsed = accountInfo?.data?.parsed

    const isMint = parsed?.type === 'mint'
    const isTokenAccount = parsed?.type === 'account'

    const owner = isTokenAccount ? parsed.info.owner : null
    // There are situations where the owner of the token account is the same as the account
    const tokenAccountIsOwner = account?.toString() === owner?.toString()

    const result = {
      account: account.toString(),
      isMint,
      isOwner: false,
      isTokenAccount,
      owner,
      program: accountInfo?.owner?.toString() ?? null,
      tokens: isMint || (isTokenAccount && !tokenAccountIsOwner) ? null : [],
    }

    // We don't want to get the token accounts if the account is a mint or token account
    // Unless the token account is the same as the owner.
    if (isMint || (isTokenAccount && !tokenAccountIsOwner)) {
      return result
    }

    const appEnv = await this.core.getAppEnvironmentByAppKey(appKey)
    const appMint = this.validateMint(appEnv, appKey, mint.toString())

    const tokenAccounts = await this.getTokenAccounts(appKey, account, appMint.mint.address, commitment)

    for (const tokenAccount of tokenAccounts ?? []) {
      const info = await solana.getParsedAccountInfo(tokenAccount, commitment)
      const parsed = info?.data?.parsed?.info

      result.tokens.push({
        account: tokenAccount,
        balance: parsed?.tokenAmount?.amount ? removeDecimals(parsed.tokenAmount.amount, appMint.mint.decimals) : null,
        closeAuthority: parsed?.closeAuthority ?? null,
        decimals: appMint.mint.decimals ?? 0,
        mint: appMint.mint.address,
        owner: parsed?.owner ?? null,
      })
    }

    return {
      ...result,
      isOwner: result.tokens.length > 0,
    }
  }

  async getHistory(
    appKey: string,
    account: PublicKeyString,
    mint: PublicKeyString,
    commitment: Commitment,
  ): Promise<HistoryResponse[]> {
    const solana = await this.getSolanaConnection(appKey)

    return this.getTokenAccounts(appKey, account, mint, commitment).then((accounts) =>
      solana.getTokenAccountsHistory(accounts),
    )
  }

  getSolanaConnection(appKey: string): Promise<Solana> {
    return this.solana.getConnection(appKey)
  }

  // Add method to get address lookup tables
  async getAddressLookupTableAccounts(
    appKey: string,
    addresses: string[]
  ): Promise<AddressLookupTableAccount[]> {
    const solana = await this.getSolanaConnection(appKey);
    const lookupTableAccounts: AddressLookupTableAccount[] = [];

    for (const address of addresses) {
      try {
        const account = await solana.connection.getAddressLookupTable(new PublicKey(address));
        if (account?.value) {
          lookupTableAccounts.push(account.value);
        }
      } catch (error) {
        this.logger.error(`Failed to fetch lookup table ${address}:`, error);
      }
    }

    return lookupTableAccounts;
  }

  async handleCloseAccount(
    input: CloseAccountRequest,
    {
      appEnv,
      appKey,
      headers,
      ip,
      ua,
    }: { appKey: string; appEnv: AppEnvironment; headers?: Record<string, string>; ip?: string; ua?: string },
  ): Promise<Transaction> {
    const processingStartedAt = Date.now()
    this.closeAccountRequestCounter.add(1, { appKey })
    const accountInfo = await this.getAccountInfo(appKey, input.account, input.mint, input.commitment)

    try {
      const tokenAccount = validateCloseAccount({
        info: accountInfo,
        mint: input.mint,
        mints: appEnv.mints.map((m) => m.mint?.address),
        wallets: appEnv.wallets.map((w) => w.publicKey),
      })

      this.closeAccountRequestValidCounter.add(1, { appKey })

      const mint = this.validateMint(appEnv, appKey, input.mint)
      const reference = input?.reference || createReference(input?.referenceType, input?.referenceId)

      const { blockhash, lastValidBlockHeight } = await this.getLatestBlockhash(appKey)

      const signer = Keypair.fromSecret(mint.wallet?.secretKey)

      const { transaction: solanaTransaction } = generateCloseAccountTransaction({
        addMemo: mint.addMemo,
        blockhash,
        index: input.index,
        lastValidBlockHeight,
        reference,
        signer: signer.solana,
        tokenAccount: tokenAccount.account,
      })

      return this.processTransaction({
        appEnv,
        appKey,
        blockhash,
        commitment: input.commitment,
        decimals: mint?.mint?.decimals,
        feePayer: tokenAccount.closeAuthority,
        headers,
        ip,
        lastValidBlockHeight,
        mintPublicKey: mint?.mint?.address,
        reference,
        processingStartedAt,
        solanaTransaction,
        source: input.account,
        tx: solanaTransaction.serialize().toString('base64'),
        ua,
        isVersioned: false, // Close account transactions are not versioned
      })
    } catch (error) {
      this.closeAccountRequestInvalidCounter.add(1, { appKey })
      throw error
    }
  }

  async getKineticTransaction(
    appKey: string,
    { reference, signature }: { signature: string; reference: string },
  ): Promise<TransactionWithErrors[]> {
    if (!reference?.length && !signature?.length) {
      throw new BadRequestException(`${appKey}: Please provide either reference or signature`)
    }
    const { environment, index } = parseAppKey(appKey)

    const found = await this.core.transaction.findMany({
      where: {
        appEnv: {
          app: {
            index,
          },
          name: environment,
        },
        ...(reference && { reference }),
        ...(signature && { signature }),
      },
      include: { errors: true },
    })
    if (!found.length) {
      throw new NotFoundException(`${appKey}: Transaction not found`)
    }
    return found
  }

  async getLatestBlockhash(appKey: string): Promise<LatestBlockhashResponse> {
    return this.core.cache.wrap<LatestBlockhashResponse>(
      'solana',
      `${appKey}:getLatestBlockhash`,
      () => this.getSolanaConnection(appKey).then((solana) => solana.getLatestBlockhash()),
      this.core.config.cache.solana.getLatestBlockhash.ttl,
    )
  }

  async getMinimumRentExemptionBalance(
    appKey: string,
    { dataLength }: MinimumRentExemptionBalanceRequest,
  ): Promise<MinimumRentExemptionBalanceResponse> {
    const solana = await this.getSolanaConnection(appKey)
    const lamports = await solana.getMinimumBalanceForRentExemption(dataLength)

    return { lamports } as MinimumRentExemptionBalanceResponse
  }

  getMintAccounts(
    appKey: string,
    account: PublicKeyString,
    commitment: Commitment,
    mints: BalanceMint[],
  ): Promise<MintAccounts[]> {
    // Create cache key
    const mintsKey = mints?.map((mint) => ellipsify(mint.publicKey, 4, '-')).join(',')

    return this.core.cache.wrap<MintAccounts[]>(
      'solana',
      `${account}:${mintsKey}:${commitment}`,
      async () => {
        // Get token accounts for each mint, gracefully handle errors (e.g. if mint is not found)
        const mintAccounts = await Promise.allSettled(
          mints?.map((mint) => this.getMintTokenAccounts(appKey, account, mint, commitment)),
        )

        // Return only fulfilled promises
        return mintAccounts
          ?.filter((item) => item.status === 'fulfilled')
          ?.map((item: PromiseFulfilledResult<MintAccounts>) => item.value)
      },
      this.core.config.cache.solana.getTokenAccounts.ttl,
      (value) => !!value?.length,
    )
  }

  getMintTokenAccounts(
    appKey: string,
    account: PublicKeyString,
    mint: BalanceMint,
    commitment: Commitment,
  ): Promise<MintAccounts> {
    return this.getTokenAccounts(appKey, account, mint.publicKey, commitment).then((accounts) => ({
      mint,
      accounts: accounts ?? [],
    }))
  }

  getTokenAccounts(
    appKey: string,
    account: PublicKeyString,
    mint: PublicKeyString,
    commitment: Commitment,
  ): Promise<string[]> {
    return this.core.cache.wrap<string[]>(
      'solana',
      `${appKey}:getTokenAccounts:${account}:${mint}:${commitment}`,
      () => this.getSolanaConnection(appKey).then((solana) => solana.getTokenAccounts(account, mint, commitment)),
      this.core.config.cache.solana.getTokenAccounts.ttl,
      (value) => !!value?.length,
    )
  }

  async getSignatureStatus(
    appKey: string,
    signature: string,
    maxSupportedTransactionVersion?: number
  ): Promise<SignatureStatus> {
    const solana = await this.getSolanaConnection(appKey);
  
    // Call getSignatureStatus with only one parameter (removed the second parameter)
    return solana.getSignatureStatus(signature);
  }

  async getTransaction(
    appKey: string,
    signature: string,
    commitment: Commitment,
    maxSupportedTransactionVersion?: number
  ): Promise<GetTransactionResponse> {
    const solana = await this.getSolanaConnection(appKey);
  
    // Call getTransaction with only two parameters (removed the third parameter)
    return solana.getTransaction(signature, commitment);
  }

  async processTransaction({
    amount,
    appEnv,
    appKey,
    blockhash,
    commitment,
    decimals,
    destination,
    feePayer,
    headers,
    ip,
    lastValidBlockHeight,
    mintPublicKey,
    reference,
    processingStartedAt,
    solanaTransaction,
    source,
    tx,
    ua,
    isVersioned,
  }: ProcessTransactionOptions): Promise<TransactionWithErrors> {
    const solana = await this.solana.getConnection(appKey)

    // Create the transaction and link it to the app environment
    const transaction: TransactionWithErrors = await this.createAppEnvTransaction(appEnv.id, {
      amount: amount ? removeDecimals(amount.toString(), decimals)?.toString() : undefined,
      appKey,
      blockhash,
      commitment,
      decimals,
      destination,
      feePayer,
      headers,
      lastValidBlockHeight,
      ip,
      mint: mintPublicKey,
      reference,
      source,
      tx,
      ua,
      isVersioned, // Store the versioned flag in the transaction record
      processingDuration: new Date().getTime() - processingStartedAt,
    })

    // Send Verify Webhook and wait for the response before continuing. If the webhook fails, we don't continue
    if (appEnv.webhookVerifyEnabled && appEnv.webhookVerifyUrl) {
      const verifiedTransaction = await this.sendVerifyWebhook(appKey, appEnv, transaction, headers)

      if (verifiedTransaction.status === TransactionStatus.Failed) {
        this.logger.error(
          `Transaction ${transaction.id} sendVerifyWebhook failed:${verifiedTransaction.errors
            .map((e) => e.message)
            .join(', ')}`,
          verifiedTransaction.errors,
        )
        return verifiedTransaction
      }
    }

    // Solana Transaction - pass the isVersioned flag
    const sent = await this.sendSolanaTransaction(appKey, transaction.id, solana, solanaTransaction, {
      maxRetries: appEnv.solanaTransactionMaxRetries ?? 0,
      skipPreflight: appEnv.solanaTransactionSkipPreflight ?? false,
      isVersioned,
    })

    if (sent.status === TransactionStatus.Failed) {
      this.logger.error(
        `Transaction ${transaction.id} sendSolanaTransaction failed: ${sent.errors.map((e) => e.message).join(', ')}`,
        sent.errors,
      )
      return sent
    }

    // Send Event Webhook after the transaction is sent to Solana (fire and forget)
    if (appEnv.webhookEventEnabled && appEnv.webhookEventUrl) {
      this.sendEventWebhook(appKey, appEnv, sent, headers).catch((err) => {
        this.logger.error(`Transaction ${transaction.id} sendEventWebhook failed: ${err.message}`, err)
      })
    }

    return sent
  }

  validateMint(appEnv: AppEnvironment, appKey: string, inputMint: string) {
    // Add null check and error logging
    if (!appEnv) {
      this.logger.error(`${appKey}: AppEnvironment is null when validating mint ${inputMint}`);
      throw new BadRequestException(`${appKey}: Application environment not found`);
    }
    
    // Add additional check for mints property
    if (!appEnv.mints || !Array.isArray(appEnv.mints)) {
      this.logger.error(`${appKey}: AppEnvironment.mints is ${appEnv.mints ? 'not an array' : 'null'} when validating mint ${inputMint}`);
      throw new BadRequestException(`${appKey}: Application environment is not properly configured`);
    }
    
    const found = appEnv.mints.find(({ mint }) => mint.address === inputMint);
    if (!found) {
      this.mintNotFoundErrorCounter.add(1, { appKey, mint: inputMint.toString() });
      throw new BadRequestException(`${appKey}: Can't find mint ${inputMint}`);
    }
    return found;
  }

  // FIXME: Validating the request should be done in a NestJS guard or interceptor
  validateRequest(appEnv: AppEnv, req: Request): { ip: string; ua: string } {
    const ip = requestIp.getClientIp(req)
    const ua = `${req.headers['kinetic-user-agent'] || req.headers['user-agent']}`

    if (appEnv?.ipsAllowed.length > 0 && !appEnv?.ipsAllowed.includes(ip)) {
      throw new UnauthorizedException('Request not allowed')
    }

    if (appEnv?.ipsBlocked.length > 0 && appEnv?.ipsBlocked.includes(ip)) {
      throw new UnauthorizedException('Request not allowed')
    }

    if (appEnv?.uasAllowed.length > 0 && !appEnv?.uasAllowed.includes(ua)) {
      throw new UnauthorizedException('Request not allowed')
    }

    if (appEnv?.uasBlocked.length > 0 && appEnv?.uasBlocked.includes(ua)) {
      throw new UnauthorizedException('Request not allowed')
    }
    return { ip, ua }
  }

  async sendEventWebhook(
    appKey: string,
    appEnv: AppEnv & { app: App },
    transaction: Transaction,
    headers?: Record<string, string>,
  ): Promise<TransactionWithErrors> {
    const webhookEventStart = new Date()
    try {
      await this.webhook.sendWebhook(appEnv, { type: WebhookType.Event, transaction, headers })
      const webhookEventEnd = new Date()
      const webhookEventDuration = webhookEventEnd?.getTime() - webhookEventStart.getTime()
      this.sendEventWebhookSuccessCounter.add(1, { appKey })
      return this.updateTransaction(transaction.id, { webhookEventStart, webhookEventEnd, webhookEventDuration })
    } catch (err) {
      this.sendEventWebhookErrorCounter.add(1, { appKey })
      const webhookEventEnd = new Date()
      const webhookEventDuration = webhookEventEnd?.getTime() - webhookEventStart.getTime()
      return this.handleTransactionError(
        transaction.id,
        { webhookEventStart, webhookEventEnd, webhookEventDuration },
        {
          type: TransactionErrorType.WebhookFailed,
          logs: [err.toString()],
          message: ` ${err.response?.data?.message ?? err.toString() ?? 'Unknown error'}`,
        },
      )
    }
  }

  private async sendVerifyWebhook(
    appKey: string,
    appEnv: AppEnv & { app: App },
    transaction,
    headers: Record<string, string>,
  ): Promise<TransactionWithErrors> {
    const webhookVerifyStart = new Date()
    try {
      await this.webhook.sendWebhook(appEnv, { type: WebhookType.Verify, transaction, headers })
      const webhookVerifyEnd = new Date()
      const webhookVerifyDuration = webhookVerifyEnd?.getTime() - webhookVerifyStart.getTime()
      this.sendVerifyWebhookSuccessCounter.add(1, { appKey })
      return this.updateTransaction(transaction.id, { webhookVerifyStart, webhookVerifyEnd, webhookVerifyDuration })
    } catch (err) {
      this.sendVerifyWebhookErrorCounter.add(1, { appKey })
      const webhookVerifyEnd = new Date()
      const webhookVerifyDuration = webhookVerifyEnd?.getTime() - webhookVerifyStart.getTime()
      return this.handleTransactionError(
        transaction.id,
        { webhookVerifyStart, webhookVerifyEnd, webhookVerifyDuration },
        {
          type: TransactionErrorType.WebhookFailed,
          logs: [err.toString()],
          message: ` ${err.response?.data?.message ?? err.toString() ?? 'Unknown error'}`,
        },
      )
    }
  }

  private async sendSolanaTransaction(
    appKey: string,
    transactionId: string,
    solana: Solana,
    solanaTransaction: SolanaTransaction | VersionedTransaction,
    { maxRetries, skipPreflight, isVersioned }: { maxRetries: number; skipPreflight: boolean; isVersioned?: boolean },
  ): Promise<TransactionWithErrors> {
    const solanaStart = new Date()
    try {
      let signature: string;

      if (isVersioned) {
        // For versioned transactions
        const versionedTx = solanaTransaction as VersionedTransaction;
        // Serialize the versioned transaction
        const serializedTx = versionedTx.serialize();
        // Send the raw transaction
        signature = await solana.connection.sendRawTransaction(serializedTx, {
          maxRetries,
          skipPreflight,
          preflightCommitment: 'confirmed'
        });
      } else {
        // For legacy transactions - use existing code
        signature = await solana.sendRawTransaction(solanaTransaction as SolanaTransaction, {
          maxRetries,
          skipPreflight
        });
      }

      const status = TransactionStatus.Committed;
      const solanaCommitted = new Date();
      const solanaCommittedDuration = solanaCommitted.getTime() - solanaStart.getTime();
      this.sendSolanaTransactionConfirmedCounter.add(1, { appKey });

      return this.updateTransaction(transactionId, {
        signature,
        status,
        solanaStart,
        solanaCommitted,
        solanaCommittedDuration,
      })
    } catch (err) {
      this.sendSolanaTransactionErrorCounter.add(1, { appKey })
      const solanaCommittedDuration = new Date().getTime() - solanaStart.getTime()
      return this.handleTransactionError(
        transactionId,
        {
          solanaStart,
          solanaCommitted: new Date(),
          solanaCommittedDuration,
        },
        {
          type: TransactionErrorType.Unknown,
          logs: [err.toString()],
          message: `${err.response?.data?.message ?? err.toString() ?? 'Unknown error'}`,
        },
      )
    }
  }
  private async handleTransactionError(
    transactionId: string,
    data: Prisma.TransactionUpdateInput,
    error: Prisma.TransactionErrorCreateWithoutTransactionInput,
  ): Promise<TransactionWithErrors> {
    return this.updateTransaction(transactionId, {
      ...data,
      status: TransactionStatus.Failed,
      errors: { create: error },
    })
  }
  private updateTransaction(id: string, data: Prisma.TransactionUpdateInput): Promise<TransactionWithErrors> {
    return this.core.transaction.update({
      where: { id },
      data,
      include: { errors: true },
    })
  }
  private async confirmTransaction(
    appKey: string,
    blockhash: string,
    commitment: Commitment,
    lastValidBlockHeight: number,
    transaction: TransactionWithErrors,
    solana: Solana,
  ): Promise<TransactionWithErrors> {
    // Get the start time from the transaction or create a new date
    const solanaStart = transaction.solanaStart || new Date();
    
    try {
      // Add your implementation to confirm the transaction
      const confirmed = await solana.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature: transaction.signature as string,
        },
        commitment
      );
      
      if (confirmed) {
        return this.updateTransaction(transaction.id, {
          status: TransactionStatus.Confirmed,
          // Add any other fields to update
        });
      }
      
      return transaction;
    } catch (error) {
      // Handle errors
      return this.handleTransactionError(
        transaction.id,
        {},
        {
          type: TransactionErrorType.Unknown,
          message: error.message || 'Unknown error confirming transaction',
        }
      );
    }
  }  
  }