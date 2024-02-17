import { useWebTransaction } from '@kinny/kinetic-web/app/data-access'
import { WebTransactionTable } from '@kinny/kinetic-web/app/ui'
import { WebUiAlert } from '@kinny/kinetic-web/ui/alert'
import { WebUiCard } from '@kinny/kinetic-web/ui/card'
import { WebUiPage } from '@kinny/kinetic-web/ui/page'
import { App, AppEnv, useUserTransactionsQuery } from '@kinny/kinetic-web/util/sdk'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export function WebAppEnvTransactionsTab({ app, env }: { app: App; env: AppEnv }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const limit = searchParams.has('limit') ? Number(searchParams.get('limit')) : 10
  const page = searchParams.has('page') ? Number(searchParams.get('page')) : 1

  const setPage = (page: number) => {
    setSearchParams({ limit: `${limit}`, page: `${page}` })
  }

  const { reference, signature, status } = useWebTransaction()
  const [{ data, fetching, error }, refresh] = useUserTransactionsQuery({
    variables: {
      appId: app.id,
      appEnvId: env.id,
      input: { limit, page, reference, status, signature },
    },
  })

  useEffect(() => {
    if (!fetching && !error) {
      const id = setTimeout(() => refresh(), 5000)
      return () => clearTimeout(id)
    }
    return
  }, [fetching, refresh])

  if (error) {
    return <WebUiAlert status="error" message={error.message} />
  }

  return (
    <WebUiPage>
      <WebUiCard>
        <WebTransactionTable
          loading={fetching}
          page={page}
          pageSize={limit}
          pageCount={data?.count?.pageCount || 1}
          transactions={data?.items || []}
          setPage={setPage}
        />
      </WebUiCard>
    </WebUiPage>
  )
}
