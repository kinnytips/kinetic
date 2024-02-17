import { WebAuthProvider } from '@kinny/kinetic-web/auth/data-access'
import { WebConfigProvider } from '@kinny/kinetic-web/shell/data-access'
import { WebUiLayout } from '@kinny/kinetic-web/ui/layout'
import { WebUiLoader } from '@kinny/kinetic-web/ui/loader'
import { GraphQLProvider } from '@kinny/kinetic-web/util/sdk'
import { Suspense } from 'react'
import { WebShellFeatureRoutes } from './web-shell-feature-routes'

export function WebShellFeature({ endpoint }: { endpoint: string }) {
  return (
    <Suspense fallback={<WebUiLoader />}>
      <GraphQLProvider endpoint={endpoint}>
        <WebConfigProvider>
          <WebAuthProvider>
            <WebUiLayout>
              <WebShellFeatureRoutes />
            </WebUiLayout>
          </WebAuthProvider>
        </WebConfigProvider>
      </GraphQLProvider>
    </Suspense>
  )
}
