import { WebUiAlert } from '@kinny/kinetic-web/ui/alert'
import { WebUiDataTable } from '@kinny/kinetic-web/ui/table'
import { UserEmail, UserEmailDetailsFragment } from '@kinny/kinetic-web/util/sdk'
import { CellProps } from 'react-table'

export function WebAdminUiUserEmailTable({ emails }: { emails: UserEmail[] }) {
  if (!emails.length) {
    return <WebUiAlert message="No users found" />
  }
  return (
    <WebUiDataTable<UserEmailDetailsFragment>
      data={emails}
      columns={[
        {
          accessor: 'email',
          Header: 'Email',
          Cell: ({ value }: CellProps<UserEmail>) => value,
        },
      ]}
    />
  )
}
