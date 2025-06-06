import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { 
  AccountMeta, 
  Keypair, 
  VersionedTransaction, 
  PublicKey, 
  AddressLookupTableAccount 
} from '@solana/web3.js'
import { parseAndSignVersionedTransaction } from './parse-and-sign-versioned-transaction'

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
  feePayer: string
  source: string
  transaction: VersionedTransaction
} {
  // Input validation
  if (!Array.isArray(addressLookupTableAccounts)) {
    throw new Error('parseAndSignVersionedTokenTransfer: addressLookupTableAccounts must be an array')
  }

  // Parse and sign the versioned transaction - let Solana determine if it's valid
  const { blockhash, feePayer, source, transaction } = parseAndSignVersionedTransaction({ 
    tx, 
    signer, 
    feePayerKeypair, 
    addressLookupTableAccounts 
  })

  const versionedTx = transaction as VersionedTransaction
  const message = versionedTx.message

  // Try SPL token transfer parsing first
  try {
    // Find token transfer instruction
    let amount: bigint | undefined = undefined
    let destination: AccountMeta | undefined = undefined
    let tokenSource: string | undefined = undefined

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

        // Check if this is a TransferChecked instruction (code 12)
        if (instruction.data[0] === 12) {
          // Resolve account keys
          const resolvedKeys = resolveAccountKeys(
            instruction.accountKeyIndexes,
            message.staticAccountKeys,
            message.addressTableLookups || [],
            addressLookupTableAccounts
          )

          if (resolvedKeys.length >= 4) {
            // For TransferChecked instruction, the accounts are:
            // 0. `[writable]` The source account.
            // 1. `[]` The token mint.
            // 2. `[writable]` The destination account.
            // 3. `[signer]` The source account's owner.
            tokenSource = resolvedKeys[0].toBase58()
            const destinationPubkey = resolvedKeys[2]

            destination = {
              pubkey: destinationPubkey,
              isSigner: false,
              isWritable: true
            }

            // Extract amount from instruction data
            if (instruction.data.length >= 9) {
              const dataArray = new Uint8Array(instruction.data)
              const dataView = new DataView(dataArray.buffer, dataArray.byteOffset + 1, 8)
              amount = dataView.getBigUint64(0, true) // little-endian
            }

            break
          }
        }
      }
    }

    if (amount === undefined || destination === undefined || tokenSource === undefined) {
      throw new Error('SPL token transfer instruction not found')
    }

    return {
      amount,
      blockhash,
      destination,
      feePayer,
      source: tokenSource,
      transaction: versionedTx
    }

  } catch (splError) {
    // SPL token transfer parsing failed, try generic handling for Jupiter/other transactions
    console.log(`SPL token transfer parsing failed, falling back to generic parsing: ${splError instanceof Error ? splError.message : String(splError)}`)
    
    // For Jupiter and other complex transactions, return generic values
    // This allows the transaction to be processed without specific instruction parsing
    const fallbackDestination = message.staticAccountKeys.length > 1 ? 
      message.staticAccountKeys[1] : message.staticAccountKeys[0]
    
    return {
      amount: BigInt(0), // Generic amount since we can't parse specific instruction data
      blockhash,
      destination: {
        pubkey: fallbackDestination,
        isSigner: false,
        isWritable: true
      },
      feePayer,
      source, // This comes from parseAndSignVersionedTransaction
      transaction: versionedTx
    }
  }
}

/**
 * Resolve account keys from static keys and address lookup tables
 */
function resolveAccountKeys(
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
    }

    // Resolve the requested account indexes
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
    // Return empty array on any error - caller will handle this gracefully
    return []
  }
}