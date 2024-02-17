import { WebAdminUiUserAppTable } from '@kinny/kinetic-web/admin/ui'
import { AppUser } from '@kinny/kinetic-web/util/sdk'
import { Maybe } from 'graphql/jsutils/Maybe'

export function WebAdminFeatureUserApps({ apps }: { apps: Maybe<AppUser[]> }) {
  return <WebAdminUiUserAppTable apps={apps || []} />
}
