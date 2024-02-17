import {
  ApiAuthService,
  ApiAuthGraphqlGuard,
  AuthToken,
  CtxUser,
  UserLoginInput,
} from '@kinny/kinetic-api/auth/data-access'
import { User } from '@kinny/kinetic-api/user/data-access'
import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'

@Resolver()
export class ApiAuthFeatureResolver {
  constructor(private readonly service: ApiAuthService) {}

  @Mutation(() => AuthToken, { nullable: true })
  async login(@Context() context, @Args('input') input: UserLoginInput) {
    return this.service.login(context.req, context.res, input)
  }

  @Mutation(() => Boolean, { nullable: true })
  async logout(@Context() context) {
    this.service.resetCookie(context.req, context.res)
    return true
  }

  @Query(() => User, { nullable: true })
  @UseGuards(ApiAuthGraphqlGuard)
  me(@CtxUser() user: User) {
    return user
  }
}
