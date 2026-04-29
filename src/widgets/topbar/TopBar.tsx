import { useState } from 'react'
import { Bell, ChevronsUpDown, Globe, LogOut, PanelLeftClose, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { cn } from '@/shared/lib/cn'

export function TopBar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const desktopNavCollapsed = useShellStore(state => state.desktopNavCollapsed)
  const opsScope = useShellStore(state => state.opsScope)
  const setOpsScope = useShellStore(state => state.setOpsScope)
  const toggleDesktopNav = useShellStore(state => state.toggleDesktopNav)
  const currentUser = useSessionStore(state => state.currentUser)
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const logout = useSessionStore(state => state.logout)
  const [query, setQuery] = useState('')

  const submitSearch = () => {
    const trimmed = query.trim()
    navigate(trimmed ? `/runtime/jobs?query=${encodeURIComponent(trimmed)}` : '/runtime/jobs')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] items-center gap-6 px-4 h-16 sm:px-6 xl:px-8">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-white lg:inline-flex transition-colors"
          onClick={toggleDesktopNav}
        >
          <PanelLeftClose className={cn('h-4 w-4 transition-transform duration-300', desktopNavCollapsed && 'rotate-180')} />
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-sm font-medium text-white">{t('topbar.title')}</h2>
            <span className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)] font-mono">
              {opsScope === 'global' ? t('topbar.globalScope') : (currentOrgId || t('topbar.internal'))}
            </span>
          </div>
        </div>

        <form
          className="hidden w-full max-w-md items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-muted)] md:flex focus-within:border-[var(--primary-soft)] focus-within:ring-1 focus-within:ring-[var(--primary-soft)] transition-all"
          onSubmit={event => {
            event.preventDefault()
            submitSearch()
          }}
        >
          <Search className="h-4 w-4 text-[var(--text-soft)]" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('topbar.searchPlaceholder')}
            className="h-9 w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]"
          />
        </form>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1 lg:inline-flex">
            <button
              type="button"
              onClick={() => setOpsScope('global')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                opsScope === 'global' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
            >
              {t('topbar.global')}
            </button>
            <button
              type="button"
              onClick={() => setOpsScope('workspace')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                opsScope === 'workspace' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
            >
              {t('topbar.workspace')}
            </button>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-white transition-colors"
            onClick={() => void i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh')}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
          </button>
          <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-white transition-colors">
            <Bell className="h-4 w-4" />
          </button>
          <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-white transition-colors">
            <span className="hidden sm:inline">{currentUser?.full_name || t('topbar.profile')}</span>
            <ChevronsUpDown className="h-4 w-4 text-[var(--text-soft)]" />
          </button>
          <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--danger)] transition-colors" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
