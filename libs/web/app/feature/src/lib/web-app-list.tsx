import { useWebApps } from '@kinny/kinetic-web/app/data-access'
import { WebAppUiAppGrid } from '@kinny/kinetic-web/app/ui'
import { useWebAuth } from '@kinny/kinetic-web/auth/data-access'
import { WebUiLoader } from '@kinny/kinetic-web/ui/loader'
import { WebUiPage } from '@kinny/kinetic-web/ui/page'
import { Button } from '@saas-ui/react'
import { Link } from 'react-router-dom'

export function WebAppList() {
  const { user } = useWebAuth()
  const { apps, loading } = useWebApps()

  if (loading) {
    return <WebUiLoader />
  }

  const action = (
    <Button as={Link} to={'create'} colorScheme="primary">
      Create app
    </Button>
  )
  const title = `My apps ${apps?.length ? ` (${apps.length}) ` : ''}`

  return (
    <WebUiPage title={title} actionRight={user?.role === 'Admin' ? action : undefined}>
      <WebAppUiAppGrid apps={apps || []} />
    </WebUiPage>
  )
}
