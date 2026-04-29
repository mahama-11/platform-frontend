import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSessionStore } from '@/app/store/sessionStore'

export function RequireAuth() {
  const location = useLocation()
  const isBootstrapping = useSessionStore(state => state.isBootstrapping)
  const isAuthenticated = useSessionStore(state => state.isAuthenticated)

  if (isBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-muted)]">Bootstrapping platform console...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
