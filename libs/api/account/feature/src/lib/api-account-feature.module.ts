import { Module } from '@nestjs/common'
import { ApiAccountFeatureController } from './api-account-feature.controller'
import { ApiAccountDataAccessModule } from '@kinny/kinetic-api/account/data-access'

@Module({
  controllers: [ApiAccountFeatureController],
  imports: [ApiAccountDataAccessModule],
})
export class ApiAccountFeatureModule {}
