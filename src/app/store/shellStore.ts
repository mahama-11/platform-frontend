import { create } from 'zustand'

import { STORAGE_KEYS } from '@/shared/config/storage'

interface ShellState {
  mobileNavOpen: boolean
  desktopNavCollapsed: boolean
  opsScope: 'global' | 'workspace'
  toggleMobileNav: () => void
  closeMobileNav: () => void
  toggleDesktopNav: () => void
  setOpsScope: (scope: 'global' | 'workspace') => void
}

const initialCollapsed = localStorage.getItem(STORAGE_KEYS.shellCollapsed) === 'true'
const initialOpsScope = localStorage.getItem(STORAGE_KEYS.opsScope) === 'workspace' ? 'workspace' : 'global'

export const useShellStore = create<ShellState>((set, get) => ({
  mobileNavOpen: false,
  desktopNavCollapsed: initialCollapsed,
  opsScope: initialOpsScope,
  toggleMobileNav: () => set(state => ({ mobileNavOpen: !state.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleDesktopNav: () => {
    const next = !get().desktopNavCollapsed
    localStorage.setItem(STORAGE_KEYS.shellCollapsed, String(next))
    set({ desktopNavCollapsed: next })
  },
  setOpsScope: scope => {
    localStorage.setItem(STORAGE_KEYS.opsScope, scope)
    set({ opsScope: scope })
  },
}))
