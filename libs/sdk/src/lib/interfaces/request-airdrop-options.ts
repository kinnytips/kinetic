import { PublicKeyString } from '@kinny/kinetic-solana'
import { Commitment } from '../../generated'

export interface RequestAirdropOptions {
  account: PublicKeyString
  amount: string
  commitment?: Commitment
  mint?: string
}
