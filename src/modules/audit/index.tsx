import { Shield } from 'lucide-react'

import { AuditPage } from '@/modules/audit/pages/AuditPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const auditModule: PlatformModuleManifest = {
  id: 'audit',
  navItems: [
    { key: 'nav.audit', path: '/audit', icon: Shield, group: 'governance' },
  ],
  routes: [{ path: 'audit', element: <AuditPage /> }],
}
