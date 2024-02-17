import { Keypair } from '@kinny/kinetic-keypair'
import { KineticSdk } from '@kinny/kinetic-sdk'
import { useWebKeypair, WebKeypairEntity } from '@kinny/kinetic-web/keypair/data-access'
import { WebToolboxUi } from '@kinny/kinetic-web/toolbox/ui'
import { WebUiAlert } from '@kinny/kinetic-web/ui/alert'
import { WebUiContainer } from '@kinny/kinetic-web/ui/container'
import { WebUiLoader } from '@kinny/kinetic-web/ui/loader'
import { App, AppEnv } from '@kinny/kinetic-web/util/sdk'
import { useEffect, useState } from 'react'

function getKeypair(selected: WebKeypairEntity): Keypair {
  if (selected.mnemonic) {
    return Keypair.fromMnemonic(selected.mnemonic)
  }
  if (selected.secretKey) {
    return Keypair.fromSecretKey(selected.secretKey)
  }
  throw new Error('Keypair has no secret key or mnemonic')
}

export function WebAppEnvToolbox({ app, env }: { app: App; env: AppEnv }) {
  const { keypairs, selected, selectKeypair } = useWebKeypair()
  const [sdk, setSdk] = useState<KineticSdk | undefined>()

  useEffect(() => {
    KineticSdk.setup({
      endpoint: `${env.endpoint}`,
      environment: `${env.name}`,
      index: app.index,
      logger: console,
    }).then(setSdk)
  }, [])

  if (!sdk) {
    return <WebUiLoader />
  }

  if (!selected || (!selected.mnemonic && !selected.secretKey)) {
    if (!keypairs?.length) {
      return <WebUiAlert status="warning" message="There are no keypairs" />
    }
    selectKeypair(keypairs[0].id ?? 0)
    return <WebUiAlert status="warning" message="Selecting first keypair" />
  }

  const keypair = getKeypair(selected)

  return (
    <WebUiContainer>
      <WebToolboxUi keypair={keypair} sdk={sdk} />
    </WebUiContainer>
  )
}
