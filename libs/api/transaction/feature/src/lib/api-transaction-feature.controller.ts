import { getAppKey } from '@kin-kinetic/api/core/util'
import {
  GetTransactionResponse,
  LatestBlockhashResponse,
  MinimumRentExemptionBalanceRequest,
  MinimumRentExemptionBalanceResponse,
} from '@kin-kinetic/api/kinetic/data-access'
import { ApiTransactionService, MakeTransferRequest, Transaction } from '@kin-kinetic/api/transaction/data-access'
import { Commitment } from '@kin-kinetic/solana'
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'

@ApiTags('transaction')
@Controller('transaction')
export class ApiTransactionFeatureController {
  constructor(private readonly service: ApiTransactionService) {}

  @Get('kinetic-transaction/:environment/:index')
  @ApiOperation({ operationId: 'getKineticTransaction' })
  @ApiParam({ name: 'index', type: 'integer' })
  @ApiQuery({ name: 'reference', type: 'string' })
  @ApiQuery({ name: 'signature', type: 'string' })
  @ApiResponse({ type: Transaction, isArray: true })
  getKineticTransaction(
    @Param('environment') environment: string,
    @Param('index', ParseIntPipe) index: number,
    @Query('reference') reference: string,
    @Query('signature') signature: string,
  ) {
    return this.service.kinetic.getKineticTransaction(getAppKey(environment, index), {
      reference,
      signature,
    })
  }

  @Get('latest-blockhash/:environment/:index')
  @ApiOperation({ operationId: 'getLatestBlockhash' })
  @ApiParam({ name: 'index', type: 'integer' })
  @ApiResponse({ type: LatestBlockhashResponse })
  getLatestBlockhash(@Param('environment') environment: string, @Param('index', ParseIntPipe) index: number) {
    return this.service.kinetic.getLatestBlockhash(getAppKey(environment, index))
  }

  @Get('minimum-rent-exemption-balance/:environment/:index')
  @ApiOperation({ operationId: 'getMinimumRentExemptionBalance' })
  @ApiParam({ name: 'index', type: 'integer' })
  @ApiResponse({ type: MinimumRentExemptionBalanceResponse })
  getMinimumRentExemptionBalance(
    @Param('environment') environment: string,
    @Param('index', ParseIntPipe) index: number,
    @Param('input') input: MinimumRentExemptionBalanceRequest,
  ) {
    return this.service.kinetic.getMinimumRentExemptionBalance(getAppKey(environment, index), input)
  }

  @Post('make-transfer')
  @ApiBody({ type: MakeTransferRequest })
  @ApiOperation({ operationId: 'makeTransfer' })
  @ApiResponse({ type: Transaction })
  makeTransfer(@Req() req: Request, @Body() body: MakeTransferRequest) {
    return this.service.makeTransfer(req, body)
  }

  @Get('transaction/:environment/:index/:signature')
  @ApiOperation({ operationId: 'getTransaction' })
  @ApiParam({ name: 'index', type: 'integer' })
  @ApiQuery({ name: 'commitment', enum: Commitment, enumName: 'Commitment' })
  @ApiQuery({ name: 'maxSupportedTransactionVersion', type: 'number', required: false, description: 'Maximum supported transaction version for versioned transactions' })
  @ApiResponse({ type: GetTransactionResponse })
  getTransaction(
    @Param('environment') environment: string,
    @Param('index', ParseIntPipe) index: number,
    @Param('signature') signature: string,
    @Query('commitment') commitment: Commitment,
    @Query('maxSupportedTransactionVersion') maxSupportedTransactionVersion?: number,
  ) {
    return this.service.kinetic.getTransaction(
      getAppKey(environment, index),
      signature,
      commitment,
      maxSupportedTransactionVersion
    )
  }

  @Get('address-lookup-tables/:environment/:index')
  @ApiOperation({ operationId: 'getAddressLookupTables', description: 'Retrieves address lookup tables for versioned transactions' })
  @ApiParam({ name: 'environment', type: 'string' })
  @ApiParam({ name: 'index', type: 'integer' })
  @ApiQuery({ name: 'addresses', type: [String], required: true, description: 'Base58-encoded addresses of lookup tables to retrieve' })
  @ApiResponse({ type: 'object', isArray: true, description: 'Array of address lookup table accounts' })
  getAddressLookupTables(
    @Param('environment') environment: string,
    @Param('index', ParseIntPipe) index: number,
    @Query('addresses') addresses: string[],
  ) {
    return this.service.kinetic.getAddressLookupTableAccounts(getAppKey(environment, index), addresses)
  }
}
