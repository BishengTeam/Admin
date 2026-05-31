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
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** 清除本地 token，并通知所有订阅者（Zustand store 等）。 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  for (const fn of clearListeners) {
    fn()
  }
}
