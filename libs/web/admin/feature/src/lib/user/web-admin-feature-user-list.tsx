import { Button } from '@chakra-ui/react'
import { WebAdminUiUserTable } from '@kinny/kinetic-web/admin/ui'
import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiLoader } from '@kinny/kinetic-web/ui/loader'
import { WebUiPage } from '@kinny/kinetic-web/ui/page'
import { useAdminUsersQuery } from '@kinny/kinetic-web/util/sdk'
import { Link } from 'react-router-dom'

export function WebAdminFeatureUserList() {
  const [{ data, fetching }] = useAdminUsersQuery()

  return (
    <WebUiPage
      title={'Users'}
      actionRight={
        <Button as={Link} to={'add'}>
          Add User
        </Button>
      }
    >
      <WebUiCard p={'0'}>{fetching ? <WebUiLoader /> : <WebAdminUiUserTable users={data?.items || []} />}</WebUiCard>
    </WebUiPage>
  )
}
