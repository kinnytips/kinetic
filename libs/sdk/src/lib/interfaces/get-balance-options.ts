import { PublicKeyString } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'

export interface GetBalanceOptions {
  account: PublicKeyString
  commitment?: Commitment
}
