import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { 
  TransactionInstruction, 
  TransactionMessage, 
  VersionedTransaction,
  AddressLookupTableAccount,
  Keypair
} from '@solana/web3.js'
import { generateKinMemoInstruction, TransactionType } from '../kin'
import { addDecimals } from './add-remove-decimals'
import { getPublicKey } from './get-public-key'

export interface GenerateVersionedTransferOptions {
  addMemo: boolean
  amount: string
  blockhash: string
  destination: string
  destinationTokenAccount: string
  index: number
  lastValidBlockHeight: number
  mintDecimals: number
  mintFeePayer: string
  mintPublicKey: string
  owner: Keypair
  ownerTokenAccount: string
  reference?: string | null
  senderCreate?: boolean
  type: TransactionType
  addressLookupTableAccounts?: AddressLookupTableAccount[]
}

export function generateVersionedTransferTransaction(
  options: GenerateVersionedTransferOptions
): VersionedTransaction {
  // Create objects from options
  const destinationPublicKey = getPublicKey(options.destination)
  const destinationTokenAccountPublicKey = getPublicKey(options.destinationTokenAccount)
  const feePayerKey = getPublicKey(options.mintFeePayer)
  const mintKey = getPublicKey(options.mintPublicKey)
  const ownerPublicKey = options.owner.publicKey
  const ownerTokenAccountPublicKey = getPublicKey(options.ownerTokenAccount)

  // Create Instructions
  const instructions: TransactionInstruction[] = []

  // Create the Memo Instruction
  if (options.addMemo) {
    instructions.push(
      generateKinMemoInstruction({
        index: options.index,
        reference: options.reference,
        type: options.type,
      }),
    )
  }

  // Create the Token Account if senderCreate is enabled
  if (options.senderCreate) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        feePayerKey,
        destinationTokenAccountPublicKey,
        destinationPublicKey,
        mintKey,
      ),
    )
  }

  // Create the Token Transfer Instruction
  instructions.push(
    createTransferCheckedInstruction(
      ownerTokenAccountPublicKey,
      mintKey,
      destinationTokenAccountPublicKey,
      ownerPublicKey,
      addDecimals(options.amount, options.mintDecimals).toNumber(),
      options.mintDecimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
  )

  // Create V0 Transaction Message
  const messageV0 = new TransactionMessage({
    payerKey: feePayerKey,
    recentBlockhash: options.blockhash,
    instructions: instructions,
  }).compileToV0Message(options.addressLookupTableAccounts || [])

  // Create the versioned transaction
  const versionedTransaction = new VersionedTransaction(messageV0)

  // Partially sign with the owner
  versionedTransaction.sign([options.owner])

  return versionedTransaction
}

export interface GenerateVersionedTransferBatchOptions {
  addMemo: boolean
  blockhash: string
  destinations: Array<{
    amount: string
    destination: string
  }>
  index: number
  lastValidBlockHeight: number
  mintDecimals: number
  mintFeePayer: string
  mintPublicKey: string
  owner: Keypair
  ownerTokenAccount: string
  reference?: string | null
  type: TransactionType
  addressLookupTableAccounts?: AddressLookupTableAccount[]
}

export function generateVersionedTransferBatchTransaction(
  options: GenerateVersionedTransferBatchOptions
): VersionedTransaction {
  // Create objects from options
  const feePayerKey = getPublicKey(options.mintFeePayer)
  const mintKey = getPublicKey(options.mintPublicKey)
  const ownerPublicKey = options.owner.publicKey
  const ownerTokenAccountPublicKey = getPublicKey(options.ownerTokenAccount)

  // Create Instructions
  const instructions: TransactionInstruction[] = []

  // Create the Memo Instruction
  if (options.addMemo) {
    instructions.push(
      generateKinMemoInstruction({
        index: options.index,
        reference: options.reference,
        type: options.type,
      }),
    )
  }

  // Create the Token Transfer Instructions for each destination
  options.destinations.forEach(({ amount, destination }) => {
    instructions.push(
      createTransferCheckedInstruction(
        ownerTokenAccountPublicKey,
        mintKey,
        getPublicKey(destination),
        ownerPublicKey,
        addDecimals(amount, options.mintDecimals).toNumber(),
        options.mintDecimals,
        [],
        TOKEN_PROGRAM_ID,
      ),
    )
  })

  // Create V0 Transaction Message
  const messageV0 = new TransactionMessage({
    payerKey: feePayerKey,
    recentBlockhash: options.blockhash,
    instructions: instructions,
  }).compileToV0Message(options.addressLookupTableAccounts || [])

  // Create the versioned transaction
  const versionedTransaction = new VersionedTransaction(messageV0)

  // Partially sign with the owner
  versionedTransaction.sign([options.owner])

  return versionedTransaction
}