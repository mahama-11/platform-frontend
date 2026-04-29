import { useMemo } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { privateModules } from '@/app/router/moduleRegistry'
import { useShellStore } from '@/app/store/shellStore'
import { cn } from '@/shared/lib/cn'
import type { ConsoleNavItem } from '@/shared/types/module'
import { SideNav } from '@/widgets/side-nav/SideNav'
import { ToastViewport } from '@/widgets/toast/ToastViewport'
import { TopBar } from '@/widgets/topbar/TopBar'

export function ConsoleShell() {
  const { t } = useTranslation()
  const mobileNavOpen = useShellStore(state => state.mobileNavOpen)
  const desktopNavCollapsed = useShellStore(state => state.desktopNavCollapsed)
  const toggleMobileNav = useShellStore(state => state.toggleMobileNav)
  const closeMobileNav = useShellStore(state => state.closeMobileNav)

  const navItems = useMemo<ConsoleNavItem[]>(() => {
    return privateModules.flatMap(module => module.navItems)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex">
      <ToastViewport />
      <SideNav navItems={navItems} mobileOpen={mobileNavOpen} onCloseMobile={closeMobileNav} />
      <div
        className={cn(
          'flex-1 min-w-0 transition-all duration-300 flex flex-col',
          desktopNavCollapsed ? 'lg:ml-20' : 'lg:ml-72',
        )}
      >
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <main className="min-w-0 flex-1 space-y-8">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)] lg:hidden"
                onClick={toggleMobileNav}
              >
                <Menu className="h-4 w-4" />
                {t('shell.mobileMenu')}
              </button>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
