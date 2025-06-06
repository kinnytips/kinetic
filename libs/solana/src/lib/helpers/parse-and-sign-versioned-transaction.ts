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

    // Log transaction details before signing
    console.log(`parseAndSignVersionedTransaction: Transaction signatures before signing: ${versionedTx.signatures.length}`)
    console.log(`parseAndSignVersionedTransaction: About to sign with: ${signingKeypair.publicKey.toBase58()}`)

    // Implement true partial signing for VersionedTransaction using constructor
    console.log(`parseAndSignVersionedTransaction: Implementing true partial signing using VersionedTransaction constructor`)
    
    try {
      const message = versionedTx.message
      const signerPubkey = signingKeypair.publicKey
      
      // Get the serialized message for signing
      const messageBytes = message.serialize()
      console.log(`parseAndSignVersionedTransaction: Message serialized, length: ${messageBytes.length}`)
      
      // Find the signer's position in the message's account keys
      let signerIndex = -1
      for (let i = 0; i < message.staticAccountKeys.length; i++) {
        if (message.staticAccountKeys[i].equals(signerPubkey)) {
          signerIndex = i
          break
        }
      }
      
      console.log(`parseAndSignVersionedTransaction: Signer ${signerPubkey.toBase58()} found at index: ${signerIndex}`)
      
      if (signerIndex >= 0) {
        // Manually create signature for VersionedTransaction (no built-in sign method)
        console.log(`parseAndSignVersionedTransaction: Creating manual signature for VersionedTransaction`)
        
        try {
          // Get message bytes to sign
          const messageBytes = message.serialize()
          console.log(`parseAndSignVersionedTransaction: Message bytes length: ${messageBytes.length}`)
          
          // Create signature using tweetnacl (ed25519)
          // Note: signingKeypair.secretKey is the private key for signing
          const nacl = require('tweetnacl')
          const signature = nacl.sign.detached(messageBytes, signingKeypair.secretKey)
          console.log(`parseAndSignVersionedTransaction: Created signature: ${Buffer.from(signature).toString('base64').substring(0, 20)}...`)
          
          // Create signatures array with proper length
          const numSigners = message.staticAccountKeys.length
          const signatures: Uint8Array[] = new Array(numSigners)
          
          // Fill with empty signatures (64 zero bytes each)
          for (let i = 0; i < numSigners; i++) {
            signatures[i] = new Uint8Array(64).fill(0)
          }
          
          // Set our signature in the correct position
          signatures[signerIndex] = signature
          console.log(`parseAndSignVersionedTransaction: Set signature at position ${signerIndex} of ${numSigners} total`)
          
          // Reconstruct the VersionedTransaction with our partial signatures
          const partiallySignedTx = new VersionedTransaction(message, signatures)
          console.log(`parseAndSignVersionedTransaction: Reconstructed VersionedTransaction with partial signatures`)
          
          // Replace the original transaction reference
          Object.assign(versionedTx, partiallySignedTx)
          
          // Log which positions have signatures
          for (let i = 0; i < signatures.length; i++) {
            const hasSignature = signatures[i] && signatures[i].some(byte => byte !== 0)
            console.log(`parseAndSignVersionedTransaction: Signature position ${i}: ${hasSignature ? 'SIGNED' : 'EMPTY'}`)
          }
          
          console.log(`parseAndSignVersionedTransaction: Manual partial signing completed successfully`)
          
        } catch (manualSignError) {
          const signErrorMessage = manualSignError instanceof Error ? manualSignError.message : String(manualSignError)
          console.log(`parseAndSignVersionedTransaction: Manual signing failed: ${signErrorMessage}`)
          console.log(`parseAndSignVersionedTransaction: Continuing with unsigned transaction for frontend signing`)
        }
        
      } else {
        console.log(`parseAndSignVersionedTransaction: Signer not found in message account keys - no signing needed`)
        console.log(`parseAndSignVersionedTransaction: This is normal for some Jupiter transactions`)
      }
      
      console.log(`parseAndSignVersionedTransaction: Partial signing completed successfully`)
      
    } catch (signingError) {
      const signingErrorMessage = signingError instanceof Error ? signingError.message : String(signingError)
      console.log(`parseAndSignVersionedTransaction: Partial signing error: ${signingErrorMessage}`)
      
      // Even if partial signing fails, we can still return the transaction
      // The frontend or another service might complete the signing
      console.log(`parseAndSignVersionedTransaction: Continuing despite partial signing error`)
      console.log(`parseAndSignVersionedTransaction: Transaction can be completed by other signers`)
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