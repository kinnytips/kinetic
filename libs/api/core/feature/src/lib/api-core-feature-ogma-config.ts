// api-core-feature-ogma-config.ts
import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '@kin-kinetic/api/config/data-access';
import type { OgmaModuleOptions } from '@ogma/nestjs-module';

@Injectable()
export class ApiCoreFeatureOgmaConfig {
  constructor(private readonly config: ApiConfigService) {}

  // Method name required by Ogma's forRootAsync(useClass)
  createModuleConfig(): OgmaModuleOptions {
    return this.buildOptions();
  }

  // Keep these if you want broader compatibility (optional)
  createOgmaOptions(): OgmaModuleOptions {
    return this.buildOptions();
  }
  createOgmaModuleOptions(): OgmaModuleOptions {
    return this.buildOptions();
  }

  private buildOptions(): OgmaModuleOptions {
    const base = {
      application: this.config.apiName,
      color: this.config.apiLogColor,
      json: this.config.apiLogJson,
      logLevel: this.config.apiLogLevel,
    };

    // Support both shapes across Ogma versions; cast once to satisfy TS.
    return {
      ...base,              // some versions expect top-level fields
      service: { ...base }, // others expect service:{...}
    } as unknown as OgmaModuleOptions;
  }
}
