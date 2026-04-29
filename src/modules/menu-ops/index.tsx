import { UtensilsCrossed } from 'lucide-react'

import { MenuOpsPage } from '@/modules/menu-ops/pages/MenuOpsPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const menuOpsModule: PlatformModuleManifest = {
  id: 'menu-ops',
  navItems: [
    { key: 'nav.menuOps', path: '/menu-ops', icon: UtensilsCrossed, group: 'operations' },
  ],
  routes: [{ path: 'menu-ops', element: <MenuOpsPage /> }],
}
