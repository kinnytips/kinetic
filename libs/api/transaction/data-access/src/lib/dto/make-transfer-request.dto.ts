import { Commitment } from '@kin-kinetic/solana'
import { ApiProperty } from '@nestjs/swagger'

export class MakeTransferRequest {
  @ApiProperty({ enum: Commitment, enumName: 'Commitment' })
  commitment: Commitment

  @ApiProperty()
  environment: string

  @ApiProperty({ type: 'integer' })
  index: number

  @ApiProperty()
  mint: string

  @ApiProperty({ type: 'integer' })
  lastValidBlockHeight: number

  @ApiProperty({ nullable: true, required: false })
  reference?: string

  @ApiProperty({ nullable: true, required: false, deprecated: true })
  referenceId?: string

  @ApiProperty({ nullable: true, required: false, deprecated: true })
  referenceType?: string

  @ApiProperty()
  tx: string

  @ApiProperty({
    required: false,
    default: false,
    description: 'Indicates if this is a versioned transaction'
  })
  isVersioned?: boolean

  @ApiProperty({
    required: false,
    nullable: true,
    type: [String],
    description: 'Base58-encoded addresses of lookup tables required for versioned transactions'
  })
  addressLookupTableAccounts?: string[]
}
