import { ApiCoreFeatureModule } from '@kinny/kinetic-api/core/feature'
import { Module } from '@nestjs/common'

@Module({
  imports: [ApiCoreFeatureModule],
})
export class AppModule {}
