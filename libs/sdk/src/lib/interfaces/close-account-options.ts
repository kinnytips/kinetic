import { PublicKeyString } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'

export interface CloseAccountOptions {
  account: PublicKeyString
  commitment?: Commitment
  mint?: string
  reference?: string
}
