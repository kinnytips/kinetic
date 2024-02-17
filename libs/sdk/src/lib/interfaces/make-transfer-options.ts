import { Keypair } from '@kinny/kinetic-keypair'
import { TransactionType } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'
import { TransferDestination } from './transfer-destination'

export interface MakeTransferOptions extends TransferDestination {
  commitment?: Commitment
  mint?: string
  owner: Keypair
  reference?: string
  senderCreate?: boolean
  type?: TransactionType
}
