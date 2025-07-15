import { ApiCoreService } from '@kin-kinetic/api/core/data-access'
import { ApiKineticService, TransactionWithErrors } from '@kin-kinetic/api/kinetic/data-access'
import { Keypair } from '@kin-kinetic/keypair'
import { 
  parseAndSignTokenTransfer, 
  parseAndSignVersionedTokenTransfer,
  extractAddressLookupTableAddresses 
} from '@kin-kinetic/solana'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Counter } from '@opentelemetry/api-metrics'
import { Transaction, TransactionErrorType, TransactionStatus } from '@prisma/client'
import { Request } from 'express'
import { MakeTransferRequest } from './dto/make-transfer-request.dto'
import { createReference, parseAppKey } from '@kin-kinetic/api/core/util'

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

        // Use the proper storeFinalizedTransaction method that handles JSON serialization
        const finalizedTx = await this.kinetic.storeFinalizedTransaction(
          appKey,
          transactionId,
          signature,
          solanaStart,
          createdAt,
          solanaTransaction,
          isVersioned
        )

        this.logger.verbose(`verifyTransaction: ${transactionId} confirmed`)
        return finalizedTx
      }
    } catch (e) {
      this.logger.error(`verifyTransaction: error ${transactionId} ${e}`)
    }
  }

  const failed = await this.storeTransactionError(
    transactionId,
    signature?.length ? `Transaction timed out` : 'Transaction never signed',
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

  async makeTransfer(req: Request, input: MakeTransferRequest): Promise<Transaction> {
    // Extract environment and index from headers (matching Android SDK)
    const environment = req.headers['kinetic-environment'] as string
    const indexStr = req.headers['kinetic-index'] as string
    
    if (!environment || !indexStr) {
      console.log('Available headers:', Object.keys(req.headers))
      throw new Error('Missing required headers: kinetic-environment and kinetic-index')
    }
    
    // Parse and validate index
    const index = parseInt(indexStr)
    if (isNaN(index)) {
      throw new Error('Invalid kinetic-index header: must be a number')
    }
    
    // Construct appKey in correct format: app-{index}-{environment}
    const appKey = `app-${index}-${environment}`
    
    // Get appEnv using the constructed appKey
    const appEnv = await this.core.getAppEnvironmentByAppKey(appKey)
    
    const processingStartedAt = new Date().getTime()

    const { ip, ua } = this.kinetic.validateRequest(appEnv, req)
    const mint = this.kinetic.validateMint(appEnv, appKey, input.mint)
    const reference = input?.reference || createReference(input?.referenceType, input?.referenceId)

    const signer = Keypair.fromSecret(mint.wallet?.secretKey)
    const txBuffer = Buffer.from(input.tx, 'base64')

    const appFeePayer = mint.wallet?.publicKey
    if (!appFeePayer) {
      throw new Error('No fee payer configured for this mint')
    }

    let amount: bigint
    let blockhash: string
    let destination: any
    let source: string
    let solanaTransaction: any
    let actuallyVersioned = false

    if (input.isVersioned) {
      try {
        let addressLookupTableAccounts
        
        if (input.addressLookupTableAccounts && input.addressLookupTableAccounts.length > 0) {
          addressLookupTableAccounts = await this.kinetic.getAddressLookupTableAccounts(
            appKey, 
            input.addressLookupTableAccounts
          )
        } else {
          const extractedAltAddresses = extractAddressLookupTableAddresses(txBuffer)
          
          if (extractedAltAddresses.length > 0) {
            addressLookupTableAccounts = await this.kinetic.getAddressLookupTableAccounts(
              appKey, 
              extractedAltAddresses
            )
          } else {
            addressLookupTableAccounts = []
          }
        }

        const versionedResult = parseAndSignVersionedTokenTransfer({
          tx: txBuffer,
          signer: signer.solana,
          feePayerKeypair: undefined,
          addressLookupTableAccounts,
        })

        amount = versionedResult.amount
        blockhash = versionedResult.blockhash
        destination = versionedResult.destination
        source = versionedResult.source
        solanaTransaction = versionedResult.transaction
        actuallyVersioned = true

      } catch (versionedError) {
        const versionedErrorMessage = versionedError?.message || String(versionedError)
        
        try {
          const legacyResult = parseAndSignTokenTransfer({
            tx: txBuffer,
            signer: signer.solana,
          })

          amount = legacyResult.amount
          blockhash = legacyResult.blockhash
          destination = legacyResult.destination
          source = legacyResult.source
          solanaTransaction = legacyResult.transaction
          actuallyVersioned = false

        } catch (legacyError) {
          const legacyErrorMessage = legacyError?.message || String(legacyError)
          throw new Error(`Failed to parse transaction: Versioned (${versionedErrorMessage}) | Legacy fallback (${legacyErrorMessage})`)
        }
      }

    } else {
      try {
        const legacyResult = parseAndSignTokenTransfer({
          tx: txBuffer,
          signer: signer.solana,
        })

        amount = legacyResult.amount
        blockhash = legacyResult.blockhash
        destination = legacyResult.destination
        source = legacyResult.source
        solanaTransaction = legacyResult.transaction
        actuallyVersioned = false

      } catch (legacyError) {
        const legacyErrorMessage = legacyError?.message || String(legacyError)
        
        if (legacyErrorMessage.includes('Versioned messages must be deserialized with VersionedMessage.deserialize')) {
          try {
            const extractedAltAddresses = extractAddressLookupTableAddresses(txBuffer)
            
            let addressLookupTableAccounts
            if (extractedAltAddresses.length > 0) {
              addressLookupTableAccounts = await this.kinetic.getAddressLookupTableAccounts(
                appKey, 
                extractedAltAddresses
              )
            } else {
              addressLookupTableAccounts = []
            }

            const versionedResult = parseAndSignVersionedTokenTransfer({
              tx: txBuffer,
              signer: signer.solana,
              feePayerKeypair: undefined,
              addressLookupTableAccounts,
            })

            amount = versionedResult.amount
            blockhash = versionedResult.blockhash
            destination = versionedResult.destination
            source = versionedResult.source
            solanaTransaction = versionedResult.transaction
            actuallyVersioned = true

          } catch (autoVersionedError) {
            const autoVersionedErrorMessage = autoVersionedError?.message || String(autoVersionedError)
            throw new Error(`Failed to parse transaction: Legacy (${legacyErrorMessage}) | Auto-versioned (${autoVersionedErrorMessage})`)
          }
        } else {
          throw new Error(`Failed to parse legacy transaction: ${legacyErrorMessage}`)
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
      feePayer: appFeePayer,
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
      isVersioned: actuallyVersioned,
    })
  }
}