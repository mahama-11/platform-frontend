import { ChevronLeft, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useShellStore } from '@/app/store/shellStore'
import { cn } from '@/shared/lib/cn'
import type { ConsoleNavGroup, ConsoleNavItem } from '@/shared/types/module'

const groupOrder: ConsoleNavGroup[] = ['overview', 'operations', 'governance']

export function SideNav({
  navItems,
  mobileOpen,
  onCloseMobile,
}: {
  navItems: ConsoleNavItem[]
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const { t } = useTranslation()
  const desktopNavCollapsed = useShellStore(state => state.desktopNavCollapsed)
  const toggleDesktopNav = useShellStore(state => state.toggleDesktopNav)

  const grouped = groupOrder.map(group => ({
    group,
    items: navItems.filter(item => item.group === group),
  }))

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[var(--bg)]/80 backdrop-blur-sm transition lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
      />
      <aside
        className={cn(
          'glass-panel fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-y-0 border-l-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 transition-all duration-300 lg:w-72',
          desktopNavCollapsed && 'lg:w-20 lg:px-2',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3 px-2">
          <div className={cn('overflow-hidden transition-all', desktopNavCollapsed && 'lg:w-0 lg:opacity-0')}>
            <p className="text-xs uppercase tracking-widest text-[var(--text-soft)] font-medium">V Platform</p>
            <h1 className="mt-1 text-base font-semibold text-white tracking-tight">{t('shell.platformDomains')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-white lg:inline-flex transition-colors"
              onClick={toggleDesktopNav}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', desktopNavCollapsed && 'rotate-180')} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-white lg:hidden transition-colors"
              onClick={onCloseMobile}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto px-1 scrollbar-hide">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className={cn('mb-3 px-3 text-[11px] uppercase tracking-wider font-semibold text-[var(--text-soft)]', desktopNavCollapsed && 'lg:hidden')}>
                {group}
              </p>
              <div className="space-y-1">
                {items.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive 
                            ? 'bg-[var(--primary-soft)] text-[var(--primary)]' 
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]',
                          desktopNavCollapsed && 'lg:justify-center lg:px-0'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={cn('truncate', desktopNavCollapsed && 'lg:hidden')}>{t(item.key)}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
