import { useToast } from '@chakra-ui/react'
import { WebAdminUiAppCreateForm } from '@kinny/kinetic-web/admin/ui'
import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiPage, WebUiPageBackButton } from '@kinny/kinetic-web/ui/page'
import { AdminAppCreateInput, useAdminCreateAppMutation } from '@kinny/kinetic-web/util/sdk'
import { useNavigate } from 'react-router-dom'

export function WebAdminFeatureAppCreate() {
  const toast = useToast()
  const navigate = useNavigate()
  const [, createApp] = useAdminCreateAppMutation()
  const submit = async (input: AdminAppCreateInput) => {
    createApp({ input })
      .then((res) => {
        if (res.data?.created) {
          toast({ status: 'success', title: 'App created.' })
          navigate(`../${res?.data?.created?.id}`)
        } else {
          toast({
            status: 'error',
            title: 'Something went wrong',
            description: `${res.error}`,
          })
        }
      })
      .catch((error) =>
        toast({
          status: 'error',
          title: 'Something went wrong',
          description: `${error}`,
        }),
      )
  }

  return (
    <WebUiPage title={'Add App'} actionLeft={<WebUiPageBackButton />}>
      <WebUiCard>
        <WebAdminUiAppCreateForm onSubmit={submit} />
      </WebUiCard>
    </WebUiPage>
  )
}
