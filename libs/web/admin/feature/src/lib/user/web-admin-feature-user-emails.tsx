import { WebAdminUiUserEmailTable } from '@kinny/kinetic-web/admin/ui'
import { UserEmail } from '@kinny/kinetic-web/util/sdk'
import { Maybe } from 'graphql/jsutils/Maybe'

export function WebAdminFeatureUserEmails({ emails }: { emails: Maybe<UserEmail[]> }) {
  return <WebAdminUiUserEmailTable emails={emails || []} />
}
