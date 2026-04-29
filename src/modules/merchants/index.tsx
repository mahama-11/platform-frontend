import { Building2 } from 'lucide-react'

import { MerchantsPage } from '@/modules/merchants/pages/MerchantsPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const merchantsModule: PlatformModuleManifest = {
  id: 'merchants',
  navItems: [
    { key: 'nav.merchants', path: '/merchants', icon: Building2, group: 'operations' },
  ],
  routes: [{ path: 'merchants', element: <MerchantsPage /> }],
}
