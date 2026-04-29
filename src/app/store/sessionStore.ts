import { create } from 'zustand'

import { platformClient } from '@/shared/api/platformClient'
import { STORAGE_KEYS } from '@/shared/config/storage'
import type { UserProfile } from '@/shared/types/auth'

interface SessionState {
  token: string | null
  currentUser: UserProfile | null
  currentOrgId: string | null
  permissions: string[]
  isBootstrapping: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  bootstrap: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  logout: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  token: localStorage.getItem(STORAGE_KEYS.token),
  currentUser: null,
  currentOrgId: localStorage.getItem(STORAGE_KEYS.orgId),
  permissions: [],
  isBootstrapping: true,
  isAuthenticated: Boolean(localStorage.getItem(STORAGE_KEYS.token)),
  login: async (email, password) => {
    const result = await platformClient.login(email, password)
    localStorage.setItem(STORAGE_KEYS.token, result.access_token)
    localStorage.setItem(STORAGE_KEYS.orgId, result.user.org_id)
    set({
      token: result.access_token,
      currentUser: result.user,
      currentOrgId: result.user.org_id,
      permissions: result.user.permissions,
      isAuthenticated: true,
      isBootstrapping: false,
    })
  },
  bootstrap: async () => {
    const token = get().token
    if (!token) {
      set({ isBootstrapping: false, isAuthenticated: false })
      return
    }
    try {
      const user = await platformClient.me()
      const perms = await platformClient.myPermissions()
      const orgId = get().currentOrgId || user.org_id
      if (orgId && orgId !== user.org_id) {
        const switched = await platformClient.switchOrganization(orgId)
        localStorage.setItem(STORAGE_KEYS.token, switched.access_token)
        localStorage.setItem(STORAGE_KEYS.orgId, switched.current_org_id)
        set({
          token: switched.access_token,
          currentUser: switched.user || user,
          currentOrgId: switched.current_org_id,
          permissions: switched.permissions,
          isAuthenticated: true,
          isBootstrapping: false,
        })
        return
      }
      localStorage.setItem(STORAGE_KEYS.orgId, orgId)
      set({
        currentUser: user,
        currentOrgId: orgId,
        permissions: perms.permissions,
        isAuthenticated: true,
        isBootstrapping: false,
      })
    } catch {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.orgId)
      set({
        token: null,
        currentUser: null,
        currentOrgId: null,
        permissions: [],
        isAuthenticated: false,
        isBootstrapping: false,
      })
    }
  },
  switchOrganization: async organizationId => {
    const result = await platformClient.switchOrganization(organizationId)
    localStorage.setItem(STORAGE_KEYS.token, result.access_token)
    localStorage.setItem(STORAGE_KEYS.orgId, result.current_org_id)
    set({
      token: result.access_token,
      currentUser: result.user || get().currentUser,
      currentOrgId: result.current_org_id,
      permissions: result.permissions,
    })
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.orgId)
    set({
      token: null,
      currentUser: null,
      currentOrgId: null,
      permissions: [],
      isAuthenticated: false,
      isBootstrapping: false,
    })
  },
}))
