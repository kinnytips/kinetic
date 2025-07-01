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

  console.log(`parseAndSignVersionedTransaction: Starting versioned transaction processing`)
  console.log(`parseAndSignVersionedTransaction: TX buffer length: ${tx.length}`)
  console.log(`parseAndSignVersionedTransaction: Signer provided: ${signer.publicKey.toBase58()}`)
  console.log(`parseAndSignVersionedTransaction: Fee payer keypair provided: ${feePayerKeypair ? feePayerKeypair.publicKey.toBase58() : 'none'}`)
  console.log(`parseAndSignVersionedTransaction: Address lookup tables provided: ${addressLookupTableAccounts.length}`)

  try {
    // Parse the versioned transaction - let Solana determine if it's valid
    console.log(`parseAndSignVersionedTransaction: Attempting to deserialize versioned transaction`)
    const versionedTx = VersionedTransaction.deserialize(tx)
    console.log(`parseAndSignVersionedTransaction: Successfully deserialized versioned transaction`)
    
    const message = versionedTx.message

    if (!message || !message.staticAccountKeys || message.staticAccountKeys.length === 0) {
      throw new Error('Invalid versioned transaction structure')
    }

    console.log(`parseAndSignVersionedTransaction: Static account keys count: ${message.staticAccountKeys.length}`)
    console.log(`parseAndSignVersionedTransaction: First few account keys:`)
    for (let i = 0; i < Math.min(3, message.staticAccountKeys.length); i++) {
      console.log(`  [${i}]: ${message.staticAccountKeys[i].toBase58()}`)
    }

    // Get the fee payer (first account in static account keys)
    const feePayer = message.staticAccountKeys[0].toBase58()
    if (!feePayer) {
      throw new Error('parseAndSignVersionedTransaction: Can\'t find fee payer in versioned transaction')
    }
    console.log(`parseAndSignVersionedTransaction: Fee payer: ${feePayer}`)

    // Get the blockhash
    if (!message.recentBlockhash) {
      throw new Error('parseAndSignVersionedTransaction: Can\'t find recentBlockhash in versioned transaction')
    }
    const blockhash = message.recentBlockhash
    console.log(`parseAndSignVersionedTransaction: Blockhash: ${blockhash}`)

    // Determine the source account
    // Look for the signer in the static account keys
    const signerKey = signer.publicKey.toBase58()
    let source = signerKey
    console.log(`parseAndSignVersionedTransaction: Looking for signer in static accounts: ${signerKey}`)

    // If signer is not in static accounts, use the first non-fee-payer account as source
    const signerInAccounts = message.staticAccountKeys.some(key => key.toBase58() === signerKey)
    console.log(`parseAndSignVersionedTransaction: Signer found in static accounts: ${signerInAccounts}`)
    
    if (!signerInAccounts) {
      if (message.staticAccountKeys.length > 1) {
        source = message.staticAccountKeys[1].toBase58()
        console.log(`parseAndSignVersionedTransaction: Using second account as source: ${source}`)
      } else {
        source = feePayer
        console.log(`parseAndSignVersionedTransaction: Using fee payer as source: ${source}`)
      }
    } else {
      console.log(`parseAndSignVersionedTransaction: Using provided signer as source: ${source}`)
    }

    // Determine which keypair to use for signing
    let signingKeypair = signer
    console.log(`parseAndSignVersionedTransaction: Default signing keypair: ${signer.publicKey.toBase58()}`)

    if (feePayerKeypair && feePayer === feePayerKeypair.publicKey.toBase58()) {
      signingKeypair = feePayerKeypair
      console.log(`parseAndSignVersionedTransaction: Using fee payer keypair for signing: ${feePayerKeypair.publicKey.toBase58()}`)
    } else {
      console.log(`parseAndSignVersionedTransaction: Using regular signer for signing: ${signer.publicKey.toBase58()}`)
    }

    // Only sign if the signer is actually required by this transaction (use existing signerInAccounts)
    if (signerInAccounts) {
      console.log(`parseAndSignVersionedTransaction: Signer is required, signing with sign method`)
      
      try {
        versionedTx.sign([signingKeypair])
        console.log(`parseAndSignVersionedTransaction: Successfully signed with sign method`)
        
      } catch (signingError) {
        const signingErrorMessage = signingError instanceof Error ? signingError.message : String(signingError)
        console.log(`parseAndSignVersionedTransaction: sign failed: ${signingErrorMessage}`)
        throw new Error(`Failed to sign versioned transaction: ${signingErrorMessage}`)
      }
    } else {
      console.log(`parseAndSignVersionedTransaction: Signer not required for this transaction, skipping signing`)
      console.log(`parseAndSignVersionedTransaction: Transaction may already be signed or signer not needed`)
    }

    const result = { 
      feePayer, 
      blockhash, 
      source, 
      transaction: versionedTx
    }

    console.log(`parseAndSignVersionedTransaction: Returning successful result`)
    console.log(`parseAndSignVersionedTransaction: Fee payer: ${result.feePayer}`)
    console.log(`parseAndSignVersionedTransaction: Source: ${result.source}`)
    console.log(`parseAndSignVersionedTransaction: Blockhash: ${result.blockhash}`)

    return result
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`parseAndSignVersionedTransaction: Error occurred: ${errorMessage}`)
    console.log(`parseAndSignVersionedTransaction: Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    
    if (error instanceof Error && error.stack) {
      console.log(`parseAndSignVersionedTransaction: Error stack: ${error.stack}`)
    }
    
    throw new Error(`parseAndSignVersionedTransaction: Failed to process versioned transaction: ${errorMessage}`)
  }
}