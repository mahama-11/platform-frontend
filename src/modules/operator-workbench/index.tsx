import { Radar } from 'lucide-react'

import { AccessInvestigatorPage } from '@/modules/operator-workbench/pages/AccessInvestigatorPage'
import { AuditRequestExplorerPage } from '@/modules/operator-workbench/pages/AuditRequestExplorerPage'
import { CommercialRouteStudioPage } from '@/modules/operator-workbench/pages/CommercialRouteStudioPage'
import { FinanceInvestigatorPage } from '@/modules/operator-workbench/pages/FinanceInvestigatorPage'
import { OperatorWorkbenchPage } from '@/modules/operator-workbench/pages/OperatorWorkbenchPage'
import { RuntimeInvestigatorPage } from '@/modules/operator-workbench/pages/RuntimeInvestigatorPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const operatorWorkbenchModule: PlatformModuleManifest = {
  id: 'operator-workbench',
  navItems: [
    { key: 'nav.operatorWorkbench', path: '/workbench', icon: Radar, group: 'workbench' },
  ],
  routes: [
    { path: 'workbench', element: <OperatorWorkbenchPage /> },
    { path: 'workbench/runtime', element: <RuntimeInvestigatorPage /> },
    { path: 'workbench/finance', element: <FinanceInvestigatorPage /> },
    { path: 'workbench/access', element: <AccessInvestigatorPage /> },
    { path: 'workbench/commercial-route', element: <CommercialRouteStudioPage /> },
    { path: 'workbench/audit', element: <AuditRequestExplorerPage /> },
  ],
}
