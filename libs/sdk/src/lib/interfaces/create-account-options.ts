import { Keypair } from '@kinny/kinetic-keypair'
import { Commitment } from '../../generated'

export interface CreateAccountOptions {
  commitment?: Commitment
  mint?: string
  owner: Keypair
  reference?: string
}
