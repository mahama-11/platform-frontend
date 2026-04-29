import { Settings } from 'lucide-react'

import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const settingsModule: PlatformModuleManifest = {
  id: 'settings',
  navItems: [
    { key: 'nav.settings', path: '/settings', icon: Settings, group: 'governance' },
  ],
  routes: [{ path: 'settings', element: <SettingsPage /> }],
}
