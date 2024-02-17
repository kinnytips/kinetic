import { WebShellFeature } from '@kinny/kinetic-web/shell/feature'
import { SaasProvider } from '@saas-ui/react'

export function App() {
  return (
    <SaasProvider>
      <WebShellFeature endpoint="/graphql" />
    </SaasProvider>
  )
}
