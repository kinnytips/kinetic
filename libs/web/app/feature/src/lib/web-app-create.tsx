import { useToast } from '@chakra-ui/react'
import { WebAppUiForm } from '@kinny/kinetic-web/app/ui'
import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiPageFull } from '@kinny/kinetic-web/ui/page'
import { AdminAppCreateInput, useAdminCreateAppMutation } from '@kinny/kinetic-web/util/sdk'
import { useNavigate } from 'react-router-dom'

export function WebAppCreate() {
  const toast = useToast()
  const navigate = useNavigate()
  const [, createAppMutation] = useAdminCreateAppMutation()
  const onSubmit = (input: AdminAppCreateInput) => {
    createAppMutation({
      input: {
        ...input,
        index: Number(input?.index),
        skipWalletCreation: true,
      },
    })
      .then((res) => {
        if (res.error) {
          return toast({
            title: 'An error occurred',
            description: `${res.error}`,
            status: 'error',
          })
        }
        navigate('/apps/' + res.data?.created?.id)
        return toast({ title: 'App created', status: 'success' })
      })
      .catch((error) =>
        toast({
          title: 'An error occurred',
          description: `${error}`,
          status: 'error',
        }),
      )
  }

  const data = {
    name: '',
    index: 0,
  }
  return (
    <WebUiPageFull title="Create App">
      <WebUiCard>
        <WebAppUiForm data={data} onSubmit={onSubmit} />
      </WebUiCard>
    </WebUiPageFull>
  )
}
