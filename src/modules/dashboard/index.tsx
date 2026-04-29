import { Home } from 'lucide-react'

import { OverviewPage } from '@/modules/dashboard/pages/OverviewPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const dashboardModule: PlatformModuleManifest = {
  id: 'dashboard',
  navItems: [
    { key: 'nav.overview', path: '/overview', icon: Home, group: 'overview' },
  ],
  routes: [
    { path: 'overview', element: <OverviewPage /> },
  ],
}
