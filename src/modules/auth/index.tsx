import type { PlatformModuleManifest } from '@/shared/types/module'
import { LoginPage } from '@/modules/auth/pages/LoginPage'

export const authModule: PlatformModuleManifest = {
  id: 'auth',
  navItems: [],
  routes: [{ path: 'login', element: <LoginPage /> }],
}
