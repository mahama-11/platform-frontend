import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'

import { useSessionStore } from '@/app/store/sessionStore'

export function SessionBootstrap() {
  const bootstrap = useSessionStore(state => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return <Outlet />
}
