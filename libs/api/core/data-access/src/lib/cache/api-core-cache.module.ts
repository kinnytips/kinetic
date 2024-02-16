import { ApiConfigDataAccessModule, ApiConfigService } from '@kin-kinetic/api/config/data-access'
import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import * as redisStore from 'cache-manager-redis-store'

import { ApiCoreCacheService } from './api-core-cache.service'

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ApiConfigDataAccessModule],
      inject: [ApiConfigService],
      isGlobal: false,
      useFactory: (cfg: ApiConfigService) => ({
        store: redisStore as any,
        url: cfg.redisUrl,
        ttl: 5,
      }),
    }),
  ],
  providers: [ApiCoreCacheService],
  exports: [ApiCoreCacheService],
})
export class ApiCoreCacheModule {}
