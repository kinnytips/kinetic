import { WebAdminUiWalletTable } from '@kinny/kinetic-web/admin/ui'
import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiLoader } from '@kinny/kinetic-web/ui/loader'
import { WebUiPage } from '@kinny/kinetic-web/ui/page'
import { useAdminWalletsQuery } from '@kinny/kinetic-web/util/sdk'

export function WebAdminFeatureWalletList() {
  const [{ data, fetching }] = useAdminWalletsQuery()

  return (
    <WebUiPage title={'Wallets'}>
      <WebUiCard p={'0'}>
        {fetching ? <WebUiLoader /> : <WebAdminUiWalletTable wallets={data?.items || []} />}
      </WebUiCard>
    </WebUiPage>
  )
}
