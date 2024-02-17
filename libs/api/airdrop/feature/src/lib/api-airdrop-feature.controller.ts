import {
  ApiAirdropService,
  RequestAirdropRequest,
  RequestAirdropResponse,
} from '@kinny/kinetic-api/airdrop/data-access'
import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('airdrop')
@Controller('airdrop')
export class ApiAirdropFeatureController {
  constructor(private readonly service: ApiAirdropService) {}

  @Post()
  @ApiOperation({ operationId: 'requestAirdrop' })
  @ApiResponse({ type: RequestAirdropResponse })
  requestAirdrop(@Body() body: RequestAirdropRequest) {
    return this.service.requestAirdrop(body)
  }
}
