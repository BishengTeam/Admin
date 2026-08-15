import { create } from 'zustand'
import {
  getToken,
  setToken,
  clearAuth,
  onAuthClear,
} from '@/core/auth'
import { authService, normalizeLoginError } from '@/services/auth'
import { clearReauthCredential } from '@/core/reauth'
import type {
  AdminAuthSession,
  AdminInfo,
  AdminSessionMode,
  ChangePasswordPayload,
} from '@/types/admin'

interface AuthState {
  token: string | null
  admin: AdminInfo | null
  permissions: string[]
  sessionMode: AdminSessionMode | null
  mustChangePassword: boolean
  initialized: boolean
  login: (username: string, password: string) => Promise<AdminAuthSession>
  logout: () => Promise<void>
  changePassword: (payload: ChangePasswordPayload) => Promise<void>
  initFromServer: () => Promise<void>
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  admin: null,
  permissions: [],
  sessionMode: null,
  mustChangePassword: false,
  initialized: false,

  login: async (username: string, password: string) => {
    try {
      const data = await authService.login(username, password)
      clearReauthCredential()
      setToken(data.access_token)
      set({
        token: data.access_token,
        admin: data.admin,
        permissions: data.permissions,
        sessionMode: data.session_mode,
        mustChangePassword: data.must_change_password || data.admin.must_change_password,
        initialized: true,
      })
      return data
    } catch (error) {
      throw normalizeLoginError(error)
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      // 无论服务端是否确认撤销，都不能把令牌继续留在当前页面；失败会继续
      // 抛给布局层展示告警，不能静默伪装为服务端退出成功。
      clearAuth()
      set({
        token: null,
        admin: null,
        permissions: [],
        sessionMode: null,
        mustChangePassword: false,
        initialized: false,
      })
    }
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    await authService.changePassword(payload)
    clearAuth()
  },

  initFromServer: async () => {
    const initializingToken = getToken()
    if (!initializingToken) return
    try {
      const data = await authService.me()
      // 会话可能在 /me 飞行期间被退出或被另一个 401 清理；旧响应不能
      // 重新写回已经失效的管理员与权限。
      if (getToken() !== initializingToken) return
      set({
        admin: data.admin,
        permissions: data.permissions,
        sessionMode: data.session_mode,
        mustChangePassword: data.must_change_password || data.admin.must_change_password,
        initialized: true,
      })
    } catch {
      // /me 是账号状态和权限的唯一事实来源。任何失败都必须清空旧状态，
      // 禁止继续使用登录时或上一次会话缓存的权限渲染可操作页面。
      if (getToken() === initializingToken) clearAuth()
    }
  },

  hasPermission: (code: string) => {
    return get().permissions.includes('*') || get().permissions.includes(code)
  },
}))

// 订阅 core/auth.ts 的 clearAuth 事件（例如 401 拦截器中触发），
// 保持 Zustand store 与当前标签页的会话令牌状态同步。
onAuthClear(() => {
  useAuthStore.setState({
    token: null,
    admin: null,
    permissions: [],
    sessionMode: null,
    mustChangePassword: false,
    initialized: false,
  })
})
