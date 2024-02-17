import { PublicKeyString } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'

export interface GetAccountInfoOptions {
  account: PublicKeyString
  commitment?: Commitment
  mint?: PublicKeyString
}
