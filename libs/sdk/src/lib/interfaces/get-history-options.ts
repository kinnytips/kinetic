import { PublicKeyString } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'

export interface GetHistoryOptions {
  account: PublicKeyString
  commitment?: Commitment
  mint?: PublicKeyString
}
