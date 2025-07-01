// File: libs/solana/src/lib/helpers/extract-address-lookup-tables.ts

import { VersionedTransaction } from '@solana/web3.js'

/**
 * Extracts address lookup table addresses from a versioned transaction buffer
 * @param txBuffer The transaction buffer to extract ALTs from
 * @returns Array of base58-encoded ALT addresses, or empty array if none found
 */
export function extractAddressLookupTableAddresses(txBuffer: Buffer): string[] {
  try {
    console.log(`ALT Extraction: Starting extraction from transaction buffer`)
    console.log(`ALT Extraction: Buffer length: ${txBuffer.length} bytes`)
    
    // Deserialize the versioned transaction (following existing codebase pattern)
    const versionedTx = VersionedTransaction.deserialize(txBuffer)
    const versionedMessage = versionedTx.message
    console.log(`ALT Extraction: Successfully deserialized versioned transaction`)
    
    // Extract address table lookups
    const addressTableLookups = versionedMessage.addressTableLookups || []
    console.log(`ALT Extraction: Found ${addressTableLookups.length} address table lookups`)
    
    // Extract the lookup table addresses
    const altAddresses: string[] = []
    
    for (let i = 0; i < addressTableLookups.length; i++) {
      const lookup = addressTableLookups[i]
      if (lookup && lookup.accountKey) {
        const address = lookup.accountKey.toBase58()
        altAddresses.push(address)
        console.log(`ALT Extraction: [${i}] Found ALT address: ${address}`)
        console.log(`ALT Extraction: [${i}] Writable indexes: ${lookup.writableIndexes?.length || 0}`)
        console.log(`ALT Extraction: [${i}] Readonly indexes: ${lookup.readonlyIndexes?.length || 0}`)
      } else {
        console.log(`ALT Extraction: [${i}] Invalid lookup table entry`)
      }
    }
    
    console.log(`ALT Extraction: Successfully extracted ${altAddresses.length} ALT addresses`)
    return altAddresses
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`ALT Extraction: Failed to extract ALTs: ${errorMessage}`)
    
    // Check if this might not be a versioned transaction
    if (errorMessage.includes('Versioned messages must be deserialized with VersionedMessage.deserialize')) {
      console.log(`ALT Extraction: Transaction is not versioned, returning empty ALT list`)
    } else {
      console.log(`ALT Extraction: Unexpected error during extraction`)
    }
    
    return [] // Return empty array on any error
  }
}