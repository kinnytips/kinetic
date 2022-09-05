import { ApiClusterDataAccessModule } from '@kin-kinetic/api/cluster/data-access'
import { Module } from '@nestjs/common'
import { ApiClusterAdminFeatureResolver } from './api-cluster-admin-feature.resolver'
import { ApiClusterMintFeatureResolver } from './api-cluster-mint-feature.resolver'
import { ApiClusterStatFeatureResolver } from './api-cluster-stat-feature.resolver'
import { ApiClusterUserFeatureResolver } from './api-cluster-user-feature.resolver'

@Module({
  imports: [ApiClusterDataAccessModule],
  providers: [
    ApiClusterAdminFeatureResolver,
    ApiClusterMintFeatureResolver,
    ApiClusterStatFeatureResolver,
    ApiClusterUserFeatureResolver,
  ],
})
export class ApiClusterFeatureModule {}
