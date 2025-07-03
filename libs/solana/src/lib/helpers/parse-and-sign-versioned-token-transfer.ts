import { decodeTransferCheckedInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { 
  AccountMeta, 
  Keypair, 
  VersionedTransaction, 
  PublicKey, 
  AddressLookupTableAccount 
} from '@solana/web3.js'
import { parseAndSignVersionedTransaction } from './parse-and-sign-versioned-transaction'

/**
 * Enhanced account key resolution with address lookup table support
 */
function resolveAccountKeysEnhanced(
  accountIndexes: readonly number[],
  staticAccountKeys: readonly PublicKey[],
  addressTableLookups: readonly { 
    accountKey: PublicKey
    writableIndexes: readonly number[]
    readonlyIndexes: readonly number[]
  }[],
  addressLookupTableAccounts: AddressLookupTableAccount[]
): PublicKey[] {
  try {
    const allAccountKeys: PublicKey[] = [...staticAccountKeys]

    // Process address lookup tables
    for (const lookupUsage of addressTableLookups) {
      try {
        const table = addressLookupTableAccounts.find(
          table => table && table.key && table.key.equals(lookupUsage.accountKey)
        )

        if (table && table.state && Array.isArray(table.state.addresses)) {
          // Add writable accounts from lookup table
          for (const tableIndex of lookupUsage.writableIndexes || []) {
            if (typeof tableIndex === 'number' && tableIndex >= 0 && 
                tableIndex < table.state.addresses.length) {
              const address = table.state.addresses[tableIndex]
              if (address) {
                allAccountKeys.push(address)
              }
            }
          }

          // Add readonly accounts from lookup table
          for (const tableIndex of lookupUsage.readonlyIndexes || []) {
            if (typeof tableIndex === 'number' && tableIndex >= 0 && 
                tableIndex < table.state.addresses.length) {
              const address = table.state.addresses[tableIndex]
              if (address) {
                allAccountKeys.push(address)
              }
            }
          }
        }
      } catch (altError) {
        // Continue processing other ALTs
      }
    }

    // Resolve the requested account indexes with bounds checking
    const resolvedKeys: PublicKey[] = []
    for (const idx of accountIndexes) {
      if (typeof idx === 'number' && idx >= 0 && idx < allAccountKeys.length) {
        const key = allAccountKeys[idx]
        if (key) {
          resolvedKeys.push(key)
        }
      }
    }

    return resolvedKeys
    
  } catch (error) {
    return [] // Return empty array to allow graceful fallback
  }
}

export function parseAndSignVersionedTokenTransfer({
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
  amount: bigint
  blockhash: string
  destination: AccountMeta
  source: string
  transaction: VersionedTransaction
} {

  // Input validation
  if (!Array.isArray(addressLookupTableAccounts)) {
    throw new Error('parseAndSignVersionedTokenTransfer: addressLookupTableAccounts must be an array')
  }

  try {
    // Parse the versioned transaction using existing logic
    const { blockhash, source, transaction } = parseAndSignVersionedTransaction({ 
      tx, signer, feePayerKeypair, addressLookupTableAccounts 
    })

    const versionedTx = transaction as VersionedTransaction
    const message = versionedTx.message

    // SPL token transfer parsing with error handling
    try {
      let amount: bigint | undefined = undefined
      let destination: AccountMeta | undefined = undefined
      let tokenSource: string | undefined = undefined

      // Look for SPL token transfer instruction in the versioned transaction
      for (let i = 0; i < message.compiledInstructions.length; i++) {
        const instruction = message.compiledInstructions[i]

        if (!instruction || 
            typeof instruction.programIdIndex !== 'number' || 
            instruction.programIdIndex >= message.staticAccountKeys.length) {
          continue
        }

        const programId = message.staticAccountKeys[instruction.programIdIndex]
        
        // Check if this is a token program instruction
        if (programId.toBase58() === TOKEN_PROGRAM_ID.toBase58()) {
          if (!instruction.data || instruction.data.length === 0) {
            continue
          }

          // Parse different SPL token instruction types
          const instructionType = instruction.data[0]
          
          if (instructionType === 12) { // TransferChecked
            // Resolve account keys using ALT accounts
            const resolvedKeys = resolveAccountKeysEnhanced(
              instruction.accountKeyIndexes,
              message.staticAccountKeys,
              message.addressTableLookups || [],
              addressLookupTableAccounts
            )

            if (resolvedKeys.length >= 4) {
              // For TransferChecked instruction:
              // 0. Source account, 1. Mint, 2. Destination account, 3. Authority
              tokenSource = resolvedKeys[0].toBase58()
              const destinationPubkey = resolvedKeys[2]

              destination = {
                pubkey: destinationPubkey,
                isSigner: false,
                isWritable: true
              }

              // Extract amount with proper error handling
              if (instruction.data.length >= 9) {
                try {
                  const dataArray = new Uint8Array(instruction.data)
                  const dataView = new DataView(dataArray.buffer, dataArray.byteOffset + 1, 8)
                  amount = dataView.getBigUint64(0, true) // little-endian
                } catch (amountError) {
                  amount = BigInt(0)
                }
              }

              break
            }
          } else if (instructionType === 3) { // Transfer (legacy)
            const resolvedKeys = resolveAccountKeysEnhanced(
              instruction.accountKeyIndexes,
              message.staticAccountKeys,
              message.addressTableLookups || [],
              addressLookupTableAccounts
            )

            if (resolvedKeys.length >= 3) {
              // For Transfer instruction:
              // 0. Source account, 1. Destination account, 2. Authority
              tokenSource = resolvedKeys[0].toBase58()
              const destinationPubkey = resolvedKeys[1]

              destination = {
                pubkey: destinationPubkey,
                isSigner: false,
                isWritable: true
              }

              // Extract amount from legacy transfer instruction
              if (instruction.data.length >= 9) {
                try {
                  const dataArray = new Uint8Array(instruction.data)
                  const dataView = new DataView(dataArray.buffer, dataArray.byteOffset + 1, 8)
                  amount = dataView.getBigUint64(0, true) // little-endian
                } catch (amountError) {
                  amount = BigInt(0)
                }
              }

              break
            }
          }
        }
      }

      // If we found a valid SPL token transfer, return it
      if (amount !== undefined && destination) {
        return {
          amount,
          blockhash,
          destination,
          source: tokenSource || source,
          transaction: versionedTx,
        }
      }

      // If no SPL token transfer found, return fallback values for Jupiter/other complex transactions
      const fallbackDestination: AccountMeta = {
        pubkey: message.staticAccountKeys.length > 1 ? message.staticAccountKeys[1] : new PublicKey(source),
        isSigner: false,
        isWritable: true
      }

      return {
        amount: BigInt(0),
        blockhash,
        destination: fallbackDestination,
        source,
        transaction: versionedTx,
      }

    } catch (parsingError) {
      // Fallback for complex transactions that can't be parsed as simple SPL transfers
      const fallbackDestination: AccountMeta = {
        pubkey: message.staticAccountKeys.length > 1 ? message.staticAccountKeys[1] : new PublicKey(source),
        isSigner: false,
        isWritable: true
      }

      return {
        amount: BigInt(0),
        blockhash,
        destination: fallbackDestination,
        source,
        transaction: versionedTx,
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`parseAndSignVersionedTokenTransfer: Failed to process versioned token transfer: ${errorMessage}`)
  }
}