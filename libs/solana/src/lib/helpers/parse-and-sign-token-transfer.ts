import { decodeTransferCheckedInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  AccountMeta,
  Keypair,
  Transaction,
  VersionedTransaction,
  MessageV0,
  TransactionMessage,
  PublicKey,
  AddressLookupTableAccount
} from '@solana/web3.js'
import { parseAndSignTransaction } from './parse-and-sign-transaction'
import { TransactionError } from './transaction-error';

export function parseAndSignTokenTransfer({
  tx,
  signer,
  addressLookupTableAccounts = []
}: {
  tx: Buffer;
  signer: Keypair;
  addressLookupTableAccounts?: AddressLookupTableAccount[];
}): {
  amount: bigint
  blockhash: string
  destination: AccountMeta
  feePayer: string
  source: string
  transaction: Transaction | VersionedTransaction
  isVersioned: boolean
} {
  // Check if this is a versioned transaction (first byte is 0x80)
  const isVersioned = tx[0] === 0x80;

  if (isVersioned) {
    // Parse versioned transaction
    const versionedTx = VersionedTransaction.deserialize(tx);
    const message = versionedTx.message;

    // Get the fee payer (first account in static account keys)
    const feePayer = message.staticAccountKeys[0].toBase58();

    // Get the blockhash - handle null case explicitly
    let blockhash = '';
    if (message.recentBlockhash) {
      // Make TypeScript happy by checking for null first
      blockhash = message.recentBlockhash.toString();
    }

    // Initialize variables to undefined
    let amount: bigint | undefined = undefined;
    let destination: AccountMeta | undefined = undefined;
    let source: string | undefined = undefined;

    // Loop through instructions to find token transfer
    for (let i = 0; i < message.compiledInstructions.length; i++) {
      const instruction = message.compiledInstructions[i];

      // Get the program ID
      const programIdIndex = instruction.programIdIndex;
      const programId = message.staticAccountKeys[programIdIndex];

      // Check if this is a token program instruction
      if (programId.toBase58() === TOKEN_PROGRAM_ID.toBase58()) {
        // This is a token program instruction, now we need to check if it's a transfer
        // For token transfers, we're looking for the TransferChecked instruction (code 12)
        if (instruction.data[0] === 12) { // 12 is the instruction code for TransferChecked
          // Get account metadata
          const accountIndices = instruction.accountKeyIndexes;

          // Resolve account keys using both static keys and lookup tables
          const resolvedKeys: PublicKey[] = [];
          
          for (const idx of accountIndices) {
            let pubkey: PublicKey | undefined = undefined;

            if (idx < message.staticAccountKeys.length) {
              pubkey = message.staticAccountKeys[idx];
            } else {
              // Need to find this key in lookup tables
              for (const lookupTableUsage of message.addressTableLookups) {
                const tableOffset = idx - message.staticAccountKeys.length;

                if (tableOffset < lookupTableUsage.writableIndexes.length) {
                  // Find the lookup table in our provided accounts
                  const table = addressLookupTableAccounts.find(
                    table => table.key.equals(lookupTableUsage.accountKey)
                  );

                  if (table) {
                    const tableIndex = lookupTableUsage.writableIndexes[tableOffset];
                    pubkey = table.state.addresses[tableIndex];
                    break;
                  }
                } else {
                  const readonlyOffset = tableOffset - lookupTableUsage.writableIndexes.length;
                  if (readonlyOffset < lookupTableUsage.readonlyIndexes.length) {
                    // Find the lookup table in our provided accounts
                    const table = addressLookupTableAccounts.find(
                      table => table.key.equals(lookupTableUsage.accountKey)
                    );

                    if (table) {
                      const tableIndex = lookupTableUsage.readonlyIndexes[readonlyOffset];
                      pubkey = table.state.addresses[tableIndex];
                      break;
                    }
                  }
                }
              }
            }

            if (!pubkey) {
              throw new Error(`Could not resolve account key at index ${idx}`);
            }
            
            resolvedKeys.push(pubkey);
          }

          // For TransferChecked instruction, the accounts are:
          // 0. `[writable]` The source account.
          // 1. `[]` The token mint.
          // 2. `[writable]` The destination account.
          // 3. `[signer]` The source account's owner.
          source = resolvedKeys[0].toBase58();
          const destinationPubkey = resolvedKeys[2];

          // Create AccountMeta for destination (similar to original implementation)
          destination = {
            pubkey: destinationPubkey,
            isSigner: false,
            isWritable: true
          };

          // Extract amount from instruction data
          // Skip first byte (instruction code), amount is next 8 bytes (u64)
          const view = new DataView(instruction.data.buffer, instruction.data.byteOffset + 1, 8);
          amount = BigInt(view.getBigUint64(0, true)); // true for little-endian

          break;
        }
      }
    }

    if (amount === undefined || destination === undefined || source === undefined) {
      throw new Error('Could not find token transfer information in versioned transaction');
    }

    // Sign the transaction
    versionedTx.sign([signer]);

    return {
      amount,
      blockhash,
      destination,
      feePayer,
      source,
      transaction: versionedTx,
      isVersioned: true
    };
  } else {
    // Use existing implementation for legacy transactions
    const { blockhash, feePayer, source, transaction, isVersioned: txIsVersioned } = parseAndSignTransaction({ tx, signer });

    // We need to cast transaction to Transaction to access instructions
    // We know it's a Transaction because txIsVersioned is false
    if (!txIsVersioned) {
      const legacyTransaction = transaction as Transaction;
    
      // Get the first token account transfer
      const instruction = legacyTransaction.instructions.find(
        (instruction) => instruction?.programId?.toBase58() === TOKEN_PROGRAM_ID?.toBase58(),
      );

      if (!instruction) {
        throw new Error(`parseAndSignTokenTransfer: Can't find token transfer instruction`);
      }

      // Get the amount and destination from the instruction
      const {
        data: { amount },
        keys: { destination },
      } = decodeTransferCheckedInstruction(instruction, TOKEN_PROGRAM_ID);

      return {
        amount,
        blockhash,
        destination,
        feePayer,
        source,
        transaction,
        isVersioned: false
      };
    } else {
      throw new Error(`parseAndSignTokenTransfer: Received versioned transaction in legacy code path`);
    }
  }
}