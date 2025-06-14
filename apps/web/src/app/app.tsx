import { WebShellFeature } from '@kin-kinetic/web/shell/feature'
import { SaasProvider } from '@saas-ui/react'
import { Toaster } from '@kin-kinetic/web/ui/toaster'
export function App() {
  return (
    <SaasProvider>
      <WebShellFeature endpoint="/graphql" />
      <Toaster />
    </SaasProvider>
  )
}
