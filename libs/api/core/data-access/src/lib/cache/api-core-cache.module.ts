import { ApiConfigDataAccessModule, ApiConfigService } from '@kin-kinetic/api/config/data-access'
import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-yet'

import { ApiCoreCacheService } from './api-core-cache.service'

@Module({
  imports: [
    CacheModule.register({
      imports: [ApiConfigDataAccessModule],
      inject: [ApiConfigService],
      isGlobal: false,
      useFactory: (cfg: ApiConfigService) => ({
        store: redisStore,
        url: cfg.redisUrl,
        ttl: 5,
      }),
    }),
  ],
  providers: [ApiCoreCacheService],
  exports: [ApiCoreCacheService],
})
export class ApiCoreCacheModule {}
