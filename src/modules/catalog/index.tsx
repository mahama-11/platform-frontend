import { Boxes } from 'lucide-react'

import { CatalogPage } from '@/modules/catalog/pages/CatalogPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const catalogModule: PlatformModuleManifest = {
  id: 'catalog',
  navItems: [
    { key: 'nav.catalog', path: '/catalog', icon: Boxes, group: 'operations' },
  ],
  routes: [{ path: 'catalog', element: <CatalogPage /> }],
}
