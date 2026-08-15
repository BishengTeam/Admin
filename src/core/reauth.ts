interface ReauthCredential {
  token: string
  expiresAt: number
}

let credential: ReauthCredential | null = null

/**
 * 高风险操作的再认证凭据只保存在当前 JavaScript 运行时内存中。
 * 页面刷新、退出登录或凭据超时后都必须重新验证当前密码。
 */
export function setReauthCredential(token: string, expiresInSeconds: number): void {
  credential = {
    token,
    expiresAt: Date.now() + Math.max(0, expiresInSeconds) * 1000,
  }
}

export function getReauthToken(): string | null {
  if (!credential) return null
  if (Date.now() >= credential.expiresAt) {
    credential = null
    return null
  }
  return credential.token
}

export function clearReauthCredential(): void {
  credential = null
}
