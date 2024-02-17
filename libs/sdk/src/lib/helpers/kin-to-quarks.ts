import { addDecimals, removeDecimals } from '@kinny/kinetic-solana'
export { addDecimals, removeDecimals } from '@kinny/kinetic-solana'
import BigNumber from 'bignumber.js'

export function quarksToKin(amount: string): string {
  return removeDecimals(amount, 5)
}

export function kinToQuarks(amount: string): BigNumber {
  return addDecimals(amount, 5)
}
