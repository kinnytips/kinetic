import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { Module } from '@nestjs/common'
import { ApiClusterAdminService } from './api-cluster-admin.service'
import { ApiClusterUserService } from './api-cluster-user.service'

@Module({
  providers: [ApiClusterAdminService, ApiClusterUserService],
  exports: [ApiClusterAdminService, ApiClusterUserService],
  imports: [ApiCoreDataAccessModule, ApiKineticDataAccessModule],
})
export class ApiClusterDataAccessModule {}
