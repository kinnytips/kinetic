import { PublicKeyString } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'

export interface GetTokenAccountsOptions {
  account: PublicKeyString
  commitment?: Commitment
  mint?: PublicKeyString
}
