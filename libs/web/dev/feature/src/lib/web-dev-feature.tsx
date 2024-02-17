import { Box } from '@chakra-ui/react'
import { WebAdminUiDashboard } from '@kinny/kinetic-web/admin/ui'
import { WebAppUiSettingsLayout } from '@kinny/kinetic-web/app/ui'
import { WebUiLinks } from '@kinny/kinetic-web/ui/link'
import { WebUiPage } from '@kinny/kinetic-web/ui/page'
import { useUptimeQuery } from '@kinny/kinetic-web/util/sdk'
import { Navigate, Route, Routes } from 'react-router-dom'

export function WebDevFeature() {
  const [{ data }] = useUptimeQuery()
  const links: WebUiLinks = [{ label: 'Development', path: '/dev' }]
  return (
    <WebAppUiSettingsLayout links={links} title="Development">
      <Routes>
        <Route index element={<Navigate to={'dashboard'} replace />} />
        <Route
          path="dashboard/*"
          element={
            <WebUiPage>
              <WebAdminUiDashboard title={'Nothing here yet...'} links={links} />
              <Box as="pre" fontSize="xs" color="gray.500" p={2} overflow="auto">
                {JSON.stringify(data, null, 2)}
              </Box>
            </WebUiPage>
          }
        />
      </Routes>
    </WebAppUiSettingsLayout>
  )
}
