import { ApiCoreService } from '@kin-kinetic/api/core/data-access'
import { Solana, SolanaLogger, Commitment } from '@kin-kinetic/solana'
import { Injectable, Logger } from '@nestjs/common'

// Define interfaces locally to avoid import issues
interface SignatureStatus {
  slot?: number;
  confirmations?: number | null;
  err?: any;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
}

interface TransactionData {
  signatures: string[];
  message: any;
}

interface ConfirmedTransactionMeta {
  err: any;
  fee: number;
  innerInstructions?: any[];
  logMessages?: string[];
  postBalances: number[];
  postTokenBalances?: any[];
  preBalances: number[];
  preTokenBalances?: any[];
  rewards?: any[];
  status: any;
}

interface TransactionResponse {
  slot?: number | null;
  transaction: TransactionData;
  meta: ConfirmedTransactionMeta | null;
  blockTime?: number | null;
}

interface GetTransactionResponse {
  signature: string;
  status: SignatureStatus;
  transaction: TransactionResponse;
}

@Injectable()
export class ApiSolanaService {
  private readonly connections = new Map<string, Solana>()
  private readonly loggers = new Map<string, Logger>()
  constructor(private readonly core: ApiCoreService) {}

  deleteConnection(appKey: string): void {
    this.connections.delete(appKey)
    this.getLogger(appKey).verbose(`Deleted cached connection for ${appKey}`)
  }

  async getConnection(appKey: string): Promise<Solana> {
    if (!this.connections.has(appKey)) {
      const appEnv = await this.core.getAppEnvironmentByAppKey(appKey)
      this.connections.set(appKey, new Solana(appEnv.cluster.endpointPrivate, { logger: this.getSolanaLogger(appKey) }))
      this.getLogger(appKey).verbose(`Created new connection for ${appKey}`)
    }
    return this.connections.get(appKey)
  }

  // Implement getSignatureStatus method with ONLY ONE parameter
  async getSignatureStatus(signature: string): Promise<SignatureStatus> {
    // Get a connection to use
    const connection = this.connections.values().next().value;
    if (!connection) {
      throw new Error('No Solana connection available');
    }
    
    // Get the raw status from the Solana connection
    const status = await connection.connection.getSignatureStatus(signature);
    
    // Map it to our SignatureStatus type
    return {
      slot: status?.context?.slot,
      confirmations: status?.value?.confirmations,
      err: status?.value?.err,
      confirmationStatus: status?.value?.confirmationStatus as 'processed' | 'confirmed' | 'finalized',
    };
  }

  // Implement getTransaction method with ONLY TWO parameters
  async getTransaction(signature: string, commitment: Commitment): Promise<GetTransactionResponse> {
    // Get a connection to use
    const connection = this.connections.values().next().value;
    if (!connection) {
      throw new Error('No Solana connection available');
    }
    
    // Get the transaction
    const txResponse = await connection.connection.getTransaction(signature, {
      commitment: commitment as any, // Convert our Commitment type to Solana's commitment type
    });
    
    if (!txResponse) {
      throw new Error(`Transaction not found: ${signature}`);
    }
    
    // Process the transaction metadata
    const meta = txResponse.meta ? {
      err: txResponse.meta.err,
      fee: txResponse.meta.fee,
      innerInstructions: txResponse.meta.innerInstructions,
      logMessages: txResponse.meta.logMessages,
      postBalances: txResponse.meta.postBalances,
      postTokenBalances: txResponse.meta.postTokenBalances,
      preBalances: txResponse.meta.preBalances,
      preTokenBalances: txResponse.meta.preTokenBalances,
      rewards: txResponse.meta.rewards || [],
      status: null // Default to null for status
    } : null;
    
    // Convert the transaction data
    const transactionData = {
      signatures: txResponse.transaction.signatures,
      message: txResponse.transaction.message,
    };
    
    // Build the full response object
    return {
      signature,
      status: this.getSignatureStatusFromTransaction(txResponse),
      transaction: {
        slot: txResponse.slot,
        transaction: transactionData,
        meta,
        blockTime: txResponse.blockTime,
      }
    };
  }

  // Helper method to extract signature status from transaction
  private getSignatureStatusFromTransaction(txResponse: any): SignatureStatus {
    return {
      slot: txResponse.slot,
      confirmations: null, // Not available from getTransaction
      err: txResponse.meta?.err,
      confirmationStatus: 'finalized', // If we got a transaction, it's finalized
    };
  }

  private getLogger(appKey: string) {
    if (!this.loggers.has(appKey)) {
      this.loggers.set(appKey, new Logger(`${ApiSolanaService.name}:${appKey}`))
    }
    return this.loggers.get(appKey)
  }

  private getSolanaLogger(appKey: string): SolanaLogger {
    const logger = this.getLogger(appKey)
    return {
      error: (message: string) => logger.error(message),
      // The Solana class is pretty verbose so we only log the messages if the log level is set to debug
      log: (message: string) => logger.debug(message),
    }
  }
}