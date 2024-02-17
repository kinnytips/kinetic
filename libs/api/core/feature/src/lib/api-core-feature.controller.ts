import { ApiCoreService } from '@kinny/kinetic-api/core/data-access'
import { OpenTelemetrySdk } from '@kinny/kinetic-api/core/util'
import { Controller, Get, NotFoundException, Response } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

@Controller()
export class ApiCoreFeatureController {
  constructor(private readonly service: ApiCoreService) {}

  @Get('metrics')
  @ApiExcludeEndpoint()
  metrics(@Response() response) {
    if (!this.service.config.metricsEndpointEnabled) {
      throw new NotFoundException()
    }
    return OpenTelemetrySdk.getMetrics(response)
  }

  @Get('uptime')
  @ApiExcludeEndpoint()
  uptime() {
    return this.service.uptime()
  }
}
