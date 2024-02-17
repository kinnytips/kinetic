import { ApiAppDataAccessModule } from '@kinny/kinetic-api/app/data-access'
import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { Module } from '@nestjs/common'
import { ApiAccountService } from './api-account.service'

@Module({
  imports: [ApiAppDataAccessModule, ApiCoreDataAccessModule, ApiKineticDataAccessModule],
  providers: [ApiAccountService],
  exports: [ApiAccountService],
})
export class ApiAccountDataAccessModule {}
