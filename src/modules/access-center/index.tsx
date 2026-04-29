import { ShieldCheck } from 'lucide-react'

import { AccessCenterPage } from '@/modules/access-center/pages/AccessCenterPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const accessCenterModule: PlatformModuleManifest = {
  id: 'access-center',
  navItems: [
    { key: 'nav.accessCenter', path: '/access-center', icon: ShieldCheck, group: 'governance' },
  ],
  routes: [{ path: 'access-center', element: <AccessCenterPage /> }],
}
