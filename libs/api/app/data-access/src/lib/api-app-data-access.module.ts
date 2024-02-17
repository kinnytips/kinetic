import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { ApiWalletDataAccessModule } from '@kinny/kinetic-api/wallet/data-access'
import { Module } from '@nestjs/common'
import { ApiAppAdminService } from './api-app-admin.service'
import { ApiAppService } from './api-app.service'
import { ApiAppEnvAdminService } from './api-app-env-admin.service'
import { ApiAppEnvUserService } from './api-app-env-user.service'
import { ApiAppUserService } from './api-app-user.service'

@Module({
  providers: [ApiAppAdminService, ApiAppService, ApiAppEnvAdminService, ApiAppEnvUserService, ApiAppUserService],
  exports: [ApiAppAdminService, ApiAppService, ApiAppEnvAdminService, ApiAppEnvUserService, ApiAppUserService],
  imports: [ApiCoreDataAccessModule, ApiKineticDataAccessModule, ApiWalletDataAccessModule],
})
export class ApiAppDataAccessModule {}
