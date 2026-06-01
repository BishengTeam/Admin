import { create } from 'zustand'
import {
  getToken,
  setToken,
  clearAuth,
  onAuthClear,
} from '@/core/auth'
import { authService, normalizeLoginError } from '@/services/auth'
import type { AdminInfo } from '@/types/admin'

interface AuthState {
  token: string | null
  admin: AdminInfo | null
  permissions: string[]
  initialized: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  initFromServer: () => Promise<void>
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  admin: null,
  permissions: [],
  initialized: false,

  login: async (username: string, password: string) => {
    try {
      const data = await authService.login(username, password)
      setToken(data.access_token)
      set({ token: data.access_token, admin: data.admin, permissions: data.permissions, initialized: true })
    } catch (error) {
      throw normalizeLoginError(error)
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } catch {
      // 即使后端 logout 失败，也要清理本地状态
    } finally {
      clearAuth()
      set({ token: null, admin: null, permissions: [], initialized: false })
    }
  },

  initFromServer: async () => {
    if (!getToken()) return
    try {
      const { admin, permissions } = await authService.me()
      set({ admin, permissions, initialized: true })
    } catch {
      // /admin/auth/me 不可用时降级：保留 token，初始化标记为完成
      // 用户可继续使用，菜单权限依赖 login 时缓存的 permissions
      set({ initialized: true })
    }
  },

  hasPermission: (code: string) => {
    return get().permissions.includes(code)
  },
}))

// 订阅 core/auth.ts 的 clearAuth 事件（例如 401 拦截器中触发），
// 保持 Zustand store 与 localStorage 状态同步。
onAuthClear(() => {
  useAuthStore.setState({ token: null, admin: null, permissions: [], initialized: false })
})
