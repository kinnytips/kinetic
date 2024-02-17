import { Mint } from '@kinny/kinetic-api/cluster/data-access'
import { Keypair } from '@kinny/kinetic-keypair'
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

@Resolver(() => Mint)
export class ApiClusterMintFeatureResolver {
  @ResolveField(() => String, { nullable: true })
  airdropPublicKey(@Parent() mint: Mint) {
    if (!mint.airdropSecretKey) return null
    try {
      const kp = Keypair.fromSecret(mint.airdropSecretKey)
      return kp?.publicKey
    } catch (e) {
      return null
    }
  }
}
