import { ModuleConfigFactory } from '@golevelup/nestjs-modules'
import { ApiConfigService } from '@kinny/kinetic-api/config/data-access'
import { Injectable } from '@nestjs/common'
import { OgmaModuleOptions } from '@ogma/nestjs-module'

@Injectable()
export class ApiCoreFeatureOgmaConfig implements ModuleConfigFactory<OgmaModuleOptions> {
  constructor(private readonly config: ApiConfigService) {}

  createModuleConfig(): OgmaModuleOptions {
    return {
      service: {
        application: this.config.apiName,
        color: this.config.apiLogColor,
        json: this.config.apiLogJson,
        logLevel: this.config.apiLogLevel,
      },
    }
  }
}
