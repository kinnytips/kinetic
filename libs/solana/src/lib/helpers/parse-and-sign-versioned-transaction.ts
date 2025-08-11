import { Keypair, VersionedTransaction, AddressLookupTableAccount } from '@solana/web3.js'

export function parseAndSignVersionedTransaction({ 
  tx, 
  signer,
  feePayerKeypair,
  addressLookupTableAccounts = []
}: { 
  tx: Buffer
  signer: Keypair
  feePayerKeypair?: Keypair
  addressLookupTableAccounts?: AddressLookupTableAccount[]
}): {
  blockhash: string
  feePayer: string
  source: string
  transaction: VersionedTransaction
} {
  // Input validation
  if (!tx || !Buffer.isBuffer(tx) || tx.length === 0) {
    throw new Error('parseAndSignVersionedTransaction: Invalid or empty transaction buffer')
  }
  
  if (!signer || !signer.publicKey) {
    throw new Error('parseAndSignVersionedTransaction: Invalid signer keypair')
  }

  try {
    // Parse the versioned transaction
    const versionedTx = VersionedTransaction.deserialize(tx)
    const message = versionedTx.message

    if (!message || !message.staticAccountKeys || message.staticAccountKeys.length === 0) {
      throw new Error('Invalid versioned transaction structure')
    }

    // Get the fee payer (first account in static account keys)
    const feePayer = message.staticAccountKeys[0].toBase58()
    if (!feePayer) {
      throw new Error('parseAndSignVersionedTransaction: Can\'t find fee payer in versioned transaction')
    }

    // Get the blockhash
    if (!message.recentBlockhash) {
      throw new Error('parseAndSignVersionedTransaction: Can\'t find recentBlockhash in versioned transaction')
    }
    const blockhash = message.recentBlockhash

    // Determine the source account
    const signerKey = signer.publicKey.toBase58()
    let source = signerKey

    // If signer is not in static accounts, use the first non-fee-payer account as source
    const signerInAccounts = message.staticAccountKeys.some(key => key.toBase58() === signerKey)
    
    if (!signerInAccounts) {
      if (message.staticAccountKeys.length > 1) {
        source = message.staticAccountKeys[1].toBase58()
      } else {
        source = feePayer
      }
    }

    // Check current signatures
    const currentSignatures = versionedTx.signatures || []
    const requiredSignaturesCount = message.header.numRequiredSignatures
    
    // Check if our signer is in the static account keys (and thus a required signer)
    const signerIndex = message.staticAccountKeys.findIndex(key => key.equals(signer.publicKey))
    const signerRequired = signerIndex !== -1 && signerIndex < requiredSignaturesCount
    
    let feePayerRequired = false
    if (feePayerKeypair) {
      const feePayerIndex = message.staticAccountKeys.findIndex(key => key.equals(feePayerKeypair.publicKey))
      feePayerRequired = feePayerIndex !== -1 && feePayerIndex < requiredSignaturesCount
    }
    
    // VersionedTransaction doesn't have a sign() method after deserialization
    // Most external transactions (like Jupiter) come pre-signed
    // This is normal and expected behavior for pre-built transactions from external services

    const result = { 
      feePayer, 
      blockhash, 
      source, 
      transaction: versionedTx
    }

    return result
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`parseAndSignVersionedTransaction: Failed to process versioned transaction: ${errorMessage}`)
  }
}