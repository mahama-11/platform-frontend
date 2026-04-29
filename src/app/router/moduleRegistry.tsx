import { accessCenterModule } from '@/modules/access-center'
import { authModule } from '@/modules/auth'
import { auditModule } from '@/modules/audit'
import { billingModule } from '@/modules/billing'
import { catalogModule } from '@/modules/catalog'
import { dashboardModule } from '@/modules/dashboard'
import { menuOpsModule } from '@/modules/menu-ops'
import { merchantsModule } from '@/modules/merchants'
import { organizationsModule } from '@/modules/organizations'
import { runtimeModule } from '@/modules/runtime'
import { settingsModule } from '@/modules/settings'
import { templateOpsModule } from '@/modules/template-ops'
import type { PlatformModuleManifest } from '@/shared/types/module'

export const publicModules: PlatformModuleManifest[] = [authModule]

export const privateModules: PlatformModuleManifest[] = [
  dashboardModule,
  runtimeModule,
  templateOpsModule,
  menuOpsModule,
  merchantsModule,
  catalogModule,
  billingModule,
  organizationsModule,
  accessCenterModule,
  auditModule,
  settingsModule,
]
