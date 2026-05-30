import { create } from 'zustand'
import {
  getToken,
  setToken,
  getAdminInfo,
  setAdminInfo,
  getPermissions,
  setPermissions,
  clearAuth,
} from '@/core/auth'
import { authService } from '@/services/auth'
import type { AdminInfo } from '@/types/admin'

interface AuthState {
  token: string | null
  admin: AdminInfo | null
  permissions: string[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  admin: getAdminInfo(),
  permissions: getPermissions(),

  login: async (username: string, password: string) => {
    const data = await authService.login(username, password)
    setToken(data.access_token)
    setAdminInfo(data.admin)
    setPermissions(data.permissions)
    set({ token: data.access_token, admin: data.admin, permissions: data.permissions })
  },

  logout: () => {
    clearAuth()
    set({ token: null, admin: null, permissions: [] })
  },

  hasPermission: (code: string) => {
    return get().permissions.includes(code)
  },
}))
