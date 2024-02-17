import { AppEnv } from '@kinny/kinetic-api/app/data-access'
import { ApiAuthGraphqlGuard, CtxUser } from '@kinny/kinetic-api/auth/data-access'
import { ApiClusterUserService, Cluster } from '@kinny/kinetic-api/cluster/data-access'
import { User } from '@kinny/kinetic-api/user/data-access'
import { UseGuards } from '@nestjs/common'
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

@Resolver(() => Cluster)
@UseGuards(ApiAuthGraphqlGuard)
export class ApiClusterUserFeatureResolver {
  constructor(private readonly service: ApiClusterUserService) {}

  @Query(() => [Cluster], { nullable: true })
  userClusters() {
    return this.service.userClusters()
  }

  @Query(() => Cluster, { nullable: true })
  userCluster(@CtxUser() user: User, @Args('clusterId') clusterId: string) {
    return this.service.userCluster(user.id, clusterId)
  }

  @ResolveField(() => [AppEnv], { nullable: true })
  envs(@Parent() cluster: Cluster) {
    return cluster.envs
  }
}
