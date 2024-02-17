import { PublicKeyString } from '@kinny/kinetic-solana'

export interface TransferDestination {
  amount: string
  destination: PublicKeyString
}
