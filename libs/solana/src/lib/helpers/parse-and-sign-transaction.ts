import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'

export function parseAndSignTransaction({ tx, signer }: { tx: Buffer; signer: Keypair }): {
  blockhash: string
  feePayer: string
  source: string
  transaction: Transaction | VersionedTransaction
  isVersioned: boolean
} {
  let transaction: Transaction | VersionedTransaction;
  let isVersioned = false;

  try {
    // First try to parse it as a versioned transaction
    transaction = VersionedTransaction.deserialize(tx);
    isVersioned = true;
    console.log("Successfully parsed as versioned transaction");
    
    // Handle versioned transaction
    const versionedTx = transaction as VersionedTransaction;
    
    // Get the fee payer (first account in static account keys)
    const feePayer = versionedTx.message.staticAccountKeys[0].toBase58();
    if (!feePayer) {
      throw new Error(`parseAndSignTransaction: Can't find token feePayer in versioned transaction`);
    }

    // Get the blockhash
    const blockhash = versionedTx.message.recentBlockhash;
    if (!blockhash) {
      throw new Error(`parseAndSignTransaction: Can't find recentBlockhash in versioned transaction`);
    }

    // Get the source - this is specific to your application's logic
    // Using first non-fee-payer account as source
    let source = '';
    for (let i = 1; i < versionedTx.message.staticAccountKeys.length; i++) {
      source = versionedTx.message.staticAccountKeys[i].toBase58();
      if (source !== feePayer) {
        break;
      }
    }
    
    if (!source) {
      throw new Error(`parseAndSignTransaction: Can't find transaction source in versioned transaction`);
    }

    // Sign the versioned transaction
    versionedTx.sign([signer]);

    return { 
      feePayer, 
      blockhash, 
      source, 
      transaction: versionedTx,
      isVersioned: true
    };
  } catch (error) {
    // If that fails, try parsing it as a legacy transaction
    try {
      console.log("Failed to parse as versioned transaction, trying legacy format");
      transaction = Transaction.from(tx);
      isVersioned = false;
      console.log("Successfully parsed as legacy transaction");
      
      // Handle legacy transaction
      const legacyTx = transaction as Transaction;
      
      // Sign it
      legacyTx.partialSign(signer);

      // Get the fee payer
      const feePayer = legacyTx.feePayer?.toBase58();
      if (!feePayer) {
        throw new Error(`parseAndSignTransaction: Can't find token feePayer in legacy transaction`);
      }

      if (!legacyTx.recentBlockhash) {
        throw new Error(`parseAndSignTransaction: Can't find recentBlockhash in legacy transaction`);
      }

      // Get the source
      const source = legacyTx.signatures
        .find((signature) => signature.publicKey.toBase58() !== feePayer)
        ?.publicKey?.toBase58();
      if (!source) {
        throw new Error(`parseAndSignTransaction: Can't find transaction source in legacy transaction`);
      }

      return { 
        feePayer, 
        blockhash: legacyTx.recentBlockhash, 
        source, 
        transaction: legacyTx,
        isVersioned: false
      };
    } catch (parseError) {
      console.error("Failed to parse transaction as either versioned or legacy:", parseError);
      throw parseError;
    }
  }
}