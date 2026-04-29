import { Building2 } from 'lucide-react'

import { OrganizationsPage } from '@/modules/organizations/pages/OrganizationsPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const organizationsModule: PlatformModuleManifest = {
  id: 'organizations',
  navItems: [
    { key: 'nav.organizations', path: '/organizations', icon: Building2, group: 'governance' },
  ],
  routes: [{ path: 'organizations', element: <OrganizationsPage /> }],
}
