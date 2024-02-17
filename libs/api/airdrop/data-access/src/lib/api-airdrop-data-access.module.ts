import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { Module } from '@nestjs/common'
import { ApiAirdropService } from './api-airdrop.service'

@Module({
  providers: [ApiAirdropService],
  exports: [ApiAirdropService],
  imports: [ApiCoreDataAccessModule, ApiKineticDataAccessModule],
})
export class ApiAirdropDataAccessModule {}
