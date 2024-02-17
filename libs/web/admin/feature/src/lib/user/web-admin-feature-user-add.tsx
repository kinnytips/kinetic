import { useToast } from '@chakra-ui/react'
import { WebAdminUiUserCreateForm } from '@kinny/kinetic-web/admin/ui'
import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiPage, WebUiPageBackButton } from '@kinny/kinetic-web/ui/page'
import { useAdminCreateUserMutation, AdminUserCreateInput } from '@kinny/kinetic-web/util/sdk'
import { useNavigate } from 'react-router-dom'

export function WebAdminFeatureUserAdd() {
  const toast = useToast()
  const navigate = useNavigate()
  const [, createUser] = useAdminCreateUserMutation()
  const submit = async (input: AdminUserCreateInput) => {
    console.log({ input })
    createUser({ input })
      .then((res) => {
        if (res.data?.created) {
          toast({ status: 'success', title: 'User created.' })
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
    <WebUiPage title={'Add User'} actionLeft={<WebUiPageBackButton />}>
      <WebUiCard>
        <WebAdminUiUserCreateForm onSubmit={submit} />
      </WebUiCard>
    </WebUiPage>
  )
}
