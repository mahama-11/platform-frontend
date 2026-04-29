import { ReceiptText } from 'lucide-react'

import { BillingPage } from '@/modules/billing/pages/BillingPage'
import { ChargeSessionDetailPage } from '@/modules/billing/pages/ChargeSessionDetailPage'
import { SettlementDetailPage } from '@/modules/billing/pages/SettlementDetailPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const billingModule: PlatformModuleManifest = {
  id: 'billing',
  navItems: [
    { key: 'nav.billing', path: '/billing', icon: ReceiptText, group: 'operations' },
  ],
  routes: [
    { path: 'billing', element: <BillingPage /> },
    { path: 'billing/charge-sessions/:chargeSessionID', element: <ChargeSessionDetailPage /> },
    { path: 'billing/settlements/:eventID', element: <SettlementDetailPage /> },
  ],
}
