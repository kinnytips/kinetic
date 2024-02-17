import { useWebAuth } from '@kinny/kinetic-web/auth/data-access'
import { WebUiLoader } from '@kinny/kinetic-web/ui/loader'
import { lazy } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AboutIndex, NotFound } from './feature'

const WebAdminFeature = lazy(async () => import('@kinny/kinetic-web/admin/feature'))
const WebAppFeature = lazy(async () => import('@kinny/kinetic-web/app/feature'))
const WebAuthFeature = lazy(async () => import('@kinny/kinetic-web/auth/feature'))
const WebDevFeature = lazy(async () => import('@kinny/kinetic-web/dev/feature'))
const WebServerFeature = lazy(async () => import('@kinny/kinetic-web/server/feature'))
const WebToolboxFeature = lazy(async () => import('@kinny/kinetic-web/toolbox/feature'))

export function WebShellFeatureRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="apps" replace />} />
      <Route path="login" element={<WebAuthFeature />} />
      <Route path="servers/*" element={<WebServerFeature />} />
      <Route element={<AuthRoute />}>
        <Route path="about" element={<AboutIndex />} />
        <Route path="admin/*" element={<WebAdminFeature />} />
        <Route path="apps/*" element={<WebAppFeature />} />
        <Route path="dev/*" element={<WebDevFeature />} />
      </Route>
      <Route path="toolbox/*" element={<WebToolboxFeature />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export function AuthRoute() {
  const { loading, user } = useWebAuth()
  const location = useLocation()

  if (loading) {
    return <WebUiLoader />
  }

  return user ? <Outlet /> : <Navigate replace to="/login" state={{ from: location }} />
}
