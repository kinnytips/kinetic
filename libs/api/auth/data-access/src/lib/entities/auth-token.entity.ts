import { User } from '@kinny/kinetic-api/user/data-access'
import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class AuthToken {
  @Field()
  token: string

  @Field(() => User)
  user: User
}
