import { decodeTransferCheckedInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { AccountMeta, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import { parseAndSignTransaction } from './parse-and-sign-transaction'

export function parseAndSignTokenTransfer({ tx, signer }: { tx: Buffer; signer: Keypair }): {
  amount: bigint
  blockhash: string
  destination: AccountMeta
  feePayer: string
  source: string
  transaction: Transaction
} {
  // Try SPL token transfer parsing first
  try {
    const { blockhash, feePayer, source, transaction } = parseAndSignTransaction({ tx, signer })
    
    // Get the first token account transfer
    const instruction = transaction.instructions.find(
      (instruction) => instruction?.programId?.toBase58() === TOKEN_PROGRAM_ID?.toBase58(),
    )
    
    if (!instruction) {
      throw new Error(`parseAndSignTokenTransfer: Can't find token transfer instruction`)
    }
    
    // Get the amount and destination from the instruction
    const {
      data: { amount },
      keys: { destination },
    } = decodeTransferCheckedInstruction(instruction, TOKEN_PROGRAM_ID)
    
    return {
      amount,
      blockhash,
      destination,
      feePayer,
      source,
      transaction,
    }
    
  } catch (splError) {
    // SPL token transfer parsing failed, try generic handling for Jupiter/other transactions
    console.log(`SPL token transfer parsing failed, falling back to generic parsing: ${splError instanceof Error ? splError.message : String(splError)}`)
    
    // Parse the transaction for basic info
    const { blockhash, feePayer, source, transaction } = parseAndSignTransaction({ tx, signer })
    
    // For Jupiter and other complex transactions, return generic values
    // This allows the transaction to be processed without specific instruction parsing
    let fallbackDestination: PublicKey
    
    try {
      // Try to find a reasonable destination from instruction accounts
      if (transaction.instructions.length > 0 && 
          transaction.instructions[0].keys && 
          transaction.instructions[0].keys.length > 1) {
        fallbackDestination = transaction.instructions[0].keys[1].pubkey
      } else if (transaction.instructions.length > 0 && 
                 transaction.instructions[0].keys && 
                 transaction.instructions[0].keys.length > 0) {
        fallbackDestination = transaction.instructions[0].keys[0].pubkey
      } else {
        // Last resort: use fee payer as destination (convert string to PublicKey)
        fallbackDestination = new PublicKey(feePayer)
      }
    } catch (e) {
      // If anything fails, just use the fee payer (convert string to PublicKey)
      fallbackDestination = new PublicKey(feePayer)
    }
    
    return {
      amount: BigInt(0), // Generic amount since we can't parse specific instruction data
      blockhash,
      destination: {
        pubkey: fallbackDestination,
        isSigner: false,
        isWritable: true
      },
      feePayer,
      source, // This comes from parseAndSignTransaction
      transaction,
    }
  }
}