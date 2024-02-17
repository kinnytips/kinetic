import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiPage } from '@kinny/kinetic-web/ui/page'
import { WebUiLoader } from './web-ui-loader'

export function WebUiLoaderPage({ title = 'Loading...' }: { title?: string }) {
  return (
    <WebUiPage title={title}>
      <WebUiCard>
        <WebUiLoader />
      </WebUiCard>
    </WebUiPage>
  )
}
