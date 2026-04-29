import { Cpu } from 'lucide-react'

import { RuntimeJobDetailPage } from '@/modules/runtime/pages/RuntimeJobDetailPage'
import { RuntimeJobsPage } from '@/modules/runtime/pages/RuntimeJobsPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const runtimeModule: PlatformModuleManifest = {
  id: 'runtime',
  navItems: [
    { key: 'nav.runtime', path: '/runtime/jobs', icon: Cpu, group: 'operations' },
  ],
  routes: [
    { path: 'runtime/jobs', element: <RuntimeJobsPage /> },
    { path: 'runtime/jobs/:runtimeJobID', element: <RuntimeJobDetailPage /> },
  ],
}
