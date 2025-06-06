import { ApiCoreService } from '@kin-kinetic/api/core/data-access'
import { createReference, getAppKey } from '@kin-kinetic/api/core/util'
import { ApiKineticService, TransactionWithErrors } from '@kin-kinetic/api/kinetic/data-access'
import { Keypair } from '@kin-kinetic/keypair'
import { 
  parseAndSignTokenTransfer, 
  parseAndSignVersionedTokenTransfer 
} from '@kin-kinetic/solana'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Counter } from '@opentelemetry/api-metrics'
import { Transaction, TransactionErrorType, TransactionStatus } from '@prisma/client'
import { Request } from 'express'
import { MakeTransferRequest } from './dto/make-transfer-request.dto'

function getExpiredTime(minutes: number) {
  return new Date(new Date().getTime() - minutes * 60_000)
}

@Injectable()
export class ApiTransactionService implements OnModuleInit {
  private logger = new Logger(ApiTransactionService.name)

  private makeTransferRequestCounter: Counter

  constructor(readonly core: ApiCoreService, readonly kinetic: ApiKineticService) {}

  async cleanupStaleTransactions() {
    const stale = await this.getExpiredTransactions()
    if (!stale.length) return
    this.timeoutTransactions(stale).then((res) => {
      this.logger.verbose(
        `cleanupStaleTransactions set ${stale?.length} stale transactions: ${res.map(
          (item) => `${item.id}=${item.status}`,
        )} `,
      )
    })
  }

  private getExpiredTransactions(): Promise<Transaction[]> {
    const expiredMinutes = 1
    const expired = getExpiredTime(expiredMinutes)
    return this.core.transaction.findMany({
      where: {
        status: { notIn: [TransactionStatus.Finalized, TransactionStatus.Failed] },
        updatedAt: { lt: expired },
      },
    })
  }

  private timeoutTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    return Promise.all(transactions.map((transaction) => this.verifyTransaction(transaction)))
  }

  private async verifyTransaction({
    appKey,
    createdAt,
    headers,
    id: transactionId,
    signature,
    solanaStart,
    status,
    isVersioned,
  }: Transaction): Promise<Transaction> {
    this.logger.verbose(`verifyTransaction: ${transactionId} ${appKey} ${status} ${signature} ${isVersioned ? '(versioned)' : ''}`)
    if (appKey && signature) {
      try {
        const status = await this.kinetic.getSignatureStatus(appKey, signature)

        if (status?.confirmationStatus === 'finalized') {
          const solana = await this.kinetic.getSolanaConnection(appKey)
          // Handle versioned transactions by specifying maxSupportedTransactionVersion
          const solanaTransaction = await solana.connection.getParsedTransaction(
            signature,
            {
              commitment: 'finalized',
              maxSupportedTransactionVersion: isVersioned ? 0 : undefined
            }
          );

          const finalizedTx = await this.kinetic.storeFinalizedTransaction(
            appKey,
            transactionId,
            signature,
            solanaStart,
            createdAt,
            solanaTransaction,
            isVersioned
          )

          const appEnv = await this.core.getAppEnvironmentByAppKey(appKey)

          // Send Event Webhook
          if (appEnv.webhookEventEnabled && appEnv.webhookEventUrl) {
            const eventWebhookTransaction = await this.kinetic.sendEventWebhook(
              appKey,
              appEnv,
              finalizedTx,
              headers as Record<string, string>,
            )
            if (eventWebhookTransaction.status === TransactionStatus.Failed) {
              this.logger.error(
                `Transaction ${transactionId} sendEventWebhook failed:${eventWebhookTransaction.errors
                  .map((e) => e.message)
                  .join(', ')}`,
                eventWebhookTransaction.errors,
              )
              return eventWebhookTransaction
            }
          }

          return finalizedTx
        }
      } catch (e) {
        return this.storeTransactionError(transactionId, `Error verifying transaction: ${e?.message || e?.toString()}`)
      }
    }

    const failed = await this.storeTransactionError(
      transactionId,
      signature ? `Transaction timed out` : 'Transaction never signed',
    )
    this.logger.verbose(`verifyTransaction: set ${transactionId} to Failed`)
    return failed
  }

  storeTransactionError(id: string, message: string) {
    return this.core.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.Failed,
        errors: {
          create: {
            type: TransactionErrorType.Timeout,
            message,
          },
        },
      },
    })
  }

  async onModuleInit() {
    this.makeTransferRequestCounter = this.core.metrics.getCounter(`api_transaction_make_transfer_request_counter`, {
      description: 'Number of requests to makeTransfer',
    })
  }

  async makeTransfer(req: Request, input: MakeTransferRequest): Promise<TransactionWithErrors> {
    const processingStartedAt = Date.now()
    const appKey = getAppKey(input.environment, input.index)
    const appEnv = await this.core.getAppEnvironmentByAppKey(appKey)
    this.makeTransferRequestCounter.add(1, { appKey })

    const { ip, ua } = this.kinetic.validateRequest(appEnv, req)

    const mint = this.kinetic.validateMint(appEnv, appKey, input.mint)
    const reference = input?.reference || createReference(input?.referenceType, input?.referenceId)

    // Process the Solana transaction - let Solana handle the routing
    const signer = Keypair.fromSecret(mint.wallet?.secretKey)
    const txBuffer = Buffer.from(input.tx, 'base64')

    let amount: bigint
    let blockhash: string
    let destination: any
    let feePayer: string
    let source: string
    let solanaTransaction: any
    let isVersioned: boolean

    if (input.isVersioned) {
      // Handle versioned transactions when explicitly flagged
      try {
        const addressLookupTableAccounts = input.addressLookupTableAccounts
          ? await this.kinetic.getAddressLookupTableAccounts(appKey, input.addressLookupTableAccounts)
          : []

        console.log(`Processing explicitly versioned transaction...`)
        const versionedResult = parseAndSignVersionedTokenTransfer({
          tx: txBuffer,
          signer: signer.solana,
          addressLookupTableAccounts,
        })

        amount = versionedResult.amount
        blockhash = versionedResult.blockhash
        destination = versionedResult.destination
        feePayer = versionedResult.feePayer
        source = versionedResult.source
        solanaTransaction = versionedResult.transaction
        isVersioned = true
        console.log(`Successfully parsed versioned transaction`)

      } catch (versionedError) {
        const errorMessage = versionedError?.message || String(versionedError)
        console.log(`Versioned parsing failed: ${errorMessage}`)
        throw new Error(`Failed to parse versioned transaction: ${errorMessage}`)
      }
    } else {
      // Try legacy first, but catch Solana's specific versioned error
      try {
        console.log(`Trying legacy transaction parsing...`)
        const legacyResult = parseAndSignTokenTransfer({
          tx: txBuffer,
          signer: signer.solana,
        })

        amount = legacyResult.amount
        blockhash = legacyResult.blockhash
        destination = legacyResult.destination
        feePayer = legacyResult.feePayer
        source = legacyResult.source
        solanaTransaction = legacyResult.transaction
        isVersioned = false
        console.log(`Successfully parsed as legacy transaction`)

      } catch (legacyError) {
        // Check if Solana specifically says this is versioned
        const errorMessage = legacyError?.message || String(legacyError)
        if (errorMessage.includes('Versioned messages must be deserialized with VersionedMessage.deserialize')) {
          console.log(`Legacy parser says this is versioned, retrying with versioned parser...`)
          
          try {
            const addressLookupTableAccounts = input.addressLookupTableAccounts
              ? await this.kinetic.getAddressLookupTableAccounts(appKey, input.addressLookupTableAccounts)
              : []

            const versionedResult = parseAndSignVersionedTokenTransfer({
              tx: txBuffer,
              signer: signer.solana,
              addressLookupTableAccounts,
            })

            amount = versionedResult.amount
            blockhash = versionedResult.blockhash
            destination = versionedResult.destination
            feePayer = versionedResult.feePayer
            source = versionedResult.source
            solanaTransaction = versionedResult.transaction
            isVersioned = true
            console.log(`Successfully parsed as versioned transaction after legacy rejection`)

          } catch (versionedError) {
            const versionedErrorMessage = versionedError?.message || String(versionedError)
            console.log(`Both parsing methods failed. Legacy error: ${errorMessage}, Versioned error: ${versionedErrorMessage}`)
            throw new Error(`Failed to parse transaction: Legacy parsing failed (${errorMessage}), Versioned parsing failed (${versionedErrorMessage})`)
          }
        } else {
          console.log(`Legacy parsing failed with non-versioned error: ${errorMessage}`)
          throw new Error(`Failed to parse legacy transaction: ${errorMessage}`)
        }
      }
    }

    return this.kinetic.processTransaction({
      amount,
      appEnv,
      appKey,
      blockhash,
      commitment: input?.commitment,
      decimals: mint?.mint?.decimals,
      destination: destination?.pubkey.toBase58(),
      feePayer,
      headers: req.headers as Record<string, string>,
      ip,
      lastValidBlockHeight: input?.lastValidBlockHeight,
      mintPublicKey: mint?.mint?.address,
      processingStartedAt,
      reference,
      solanaTransaction,
      source,
      tx: input.tx,
      ua,
      isVersioned,
    })
  }
}