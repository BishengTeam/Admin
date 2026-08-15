import { clearReauthCredential } from './reauth'

const TOKEN_KEY = 'admin_token'

// ── 事件机制：允许外部模块（如 request.ts）通知 Zustand store 认证已失效 ──
type AuthClearListener = () => void
const clearListeners: AuthClearListener[] = []

/** 注册 clearAuth 回调。返回 unsubscribe 函数。 */
export function onAuthClear(fn: AuthClearListener): () => void {
  clearListeners.push(fn)
  return () => {
    const idx = clearListeners.indexOf(fn)
    if (idx >= 0) clearListeners.splice(idx, 1)
  }
}

export function getToken(): string | null {
  // 旧版本曾将管理员令牌写入 localStorage。启动时直接清除，避免升级后
  // 继续形成跨浏览器会话的“记住我”效果，也不信任遗留令牌。
  localStorage.removeItem(TOKEN_KEY)
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

/** 清除本地 token，并通知所有订阅者（Zustand store 等）。 */
export function clearAuth(): void {
  clearToken()
  clearReauthCredential()
  for (const fn of clearListeners) {
    fn()
  }
}
