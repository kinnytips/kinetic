import { Button, Input, Stack } from '@chakra-ui/react'
import { AppConfigMint, KineticSdk } from '@kin-kinetic/sdk'
import React, { ChangeEvent, useState } from 'react'
import { DemoKeypairEntity } from '@kin-kinetic/demo/keypair/data-access'
import { MintSwitcher } from './mint-switcher'
import { SdkControlPanelResult } from './sdk-control-panel-result'

export function SdkControlPanelTokenAccounts({ keypair, sdk }: { keypair: DemoKeypairEntity; sdk: KineticSdk }) {
  const mints = sdk?.config()?.mints || []
  const [mint, setMint] = useState<AppConfigMint>(mints[0])
  const [result, setResult] = useState<unknown>(null)
  const [account, setAccount] = useState<string>(keypair.publicKey)
  const getResult = () => sdk.getTokenAccounts({ account, mint: mint.publicKey }).then((res) => setResult(res))
  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button className="get-token-accounts-btn" onClick={getResult}>
          Get Token Accounts
        </Button>
        <MintSwitcher mint={mint} mints={mints} selectMint={setMint} />
        <Input
          w="fit-content"
          value={account}
          onChange={(ev: ChangeEvent<HTMLInputElement>) => setAccount(ev.target.value)}
          placeholder="Enter the accountId (Public Key for the Account owner)"
        />
      </Stack>
      <SdkControlPanelResult data={result} />
    </Stack>
  )
}
