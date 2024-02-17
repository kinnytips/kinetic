import { ApiAccountFeatureModule } from '@kinny/kinetic-api/account/feature'
import { ApiAirdropFeatureModule } from '@kinny/kinetic-api/airdrop/feature'
import { ApiAppFeatureModule } from '@kinny/kinetic-api/app/feature'
import { ApiAuthFeatureModule } from '@kinny/kinetic-api/auth/feature'
import { ApiClusterFeatureModule } from '@kinny/kinetic-api/cluster/feature'
import { ApiConfigDataAccessModule, ApiConfigService } from '@kinny/kinetic-api/config/data-access'
import { ApiConfigFeatureModule } from '@kinny/kinetic-api/config/feature'
import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiCronDataAccessModule } from '@kinny/kinetic-api/cron/data-access'
import { ApiKineticFeatureModule } from '@kinny/kinetic-api/kinetic/feature'
import { ApiQueueFeatureModule } from '@kinny/kinetic-api/queue/feature'
import { ApiTransactionFeatureModule } from '@kinny/kinetic-api/transaction/feature'
import { ApiUserFeatureModule } from '@kinny/kinetic-api/user/feature'
import { ApiWalletFeatureModule } from '@kinny/kinetic-api/wallet/feature'
import { ApiWebhookFeatureModule } from '@kinny/kinetic-api/webhook/feature'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ScheduleModule } from '@nestjs/schedule'
import { ServeStaticModule } from '@nestjs/serve-static'
import { OgmaModule } from '@ogma/nestjs-module'
import { OpenTelemetryModule } from 'nestjs-otel'
import { ApiCoreFeatureOgmaConfig } from './api-core-feature-ogma-config'
import { ApiCoreFeatureController } from './api-core-feature.controller'
import { ApiCoreFeatureResolver } from './api-core-feature.resolver'
import { serveStaticFactory } from './serve-static.factory'

@Module({
  controllers: [ApiCoreFeatureController],
  providers: [ApiCoreFeatureResolver],
  imports: [
    ApiAccountFeatureModule,
    ApiAirdropFeatureModule,
    ApiAppFeatureModule,
    ApiAuthFeatureModule,
    ApiClusterFeatureModule,
    ApiConfigFeatureModule,
    ApiCoreDataAccessModule,
    ApiCronDataAccessModule,
    ApiKineticFeatureModule,
    ApiQueueFeatureModule,
    ApiTransactionFeatureModule,
    ApiUserFeatureModule,
    ApiWalletFeatureModule,
    ApiWebhookFeatureModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ApiConfigDataAccessModule, ApiWebhookFeatureModule],
      inject: [ApiConfigService],
      useFactory: (cfg: ApiConfigService) => cfg.graphqlConfig,
    }),
    OgmaModule.forRootAsync({
      imports: [ApiConfigDataAccessModule],
      inject: [ApiConfigService],
      useClass: ApiCoreFeatureOgmaConfig,
    }),
    OpenTelemetryModule.forRootAsync({
      imports: [ApiConfigDataAccessModule],
      inject: [ApiConfigService],
      useFactory: (cfg: ApiConfigService) => cfg.openTelemetryConfig,
    }),
    ServeStaticModule.forRootAsync({ useFactory: serveStaticFactory() }),
    ScheduleModule.forRoot(),
  ],
})
export class ApiCoreFeatureModule {}
