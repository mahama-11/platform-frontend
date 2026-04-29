import { Blocks } from 'lucide-react'

import { TemplateOpsPage } from '@/modules/template-ops/pages/TemplateOpsPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const templateOpsModule: PlatformModuleManifest = {
  id: 'template-ops',
  navItems: [
    { key: 'nav.templateOps', path: '/template-ops', icon: Blocks, group: 'operations' },
  ],
  routes: [{ path: 'template-ops', element: <TemplateOpsPage /> }],
}
