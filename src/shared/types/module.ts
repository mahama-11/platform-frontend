import type { LucideIcon } from 'lucide-react'
import type { RouteObject } from 'react-router-dom'

export type ConsoleNavGroup = 'workbench' | 'overview' | 'operations' | 'governance'

export interface ConsoleNavItem {
  key: string
  path: string
  icon: LucideIcon
  group: ConsoleNavGroup
}

export interface PlatformModuleManifest {
  id: string
  navItems: ConsoleNavItem[]
  routes: RouteObject[]
}
