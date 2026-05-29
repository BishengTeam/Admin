import type { AdminInfo } from '@/types/admin'

const TOKEN_KEY = 'admin_token'
const ADMIN_KEY = 'admin_info'
const PERMISSIONS_KEY = 'admin_permissions'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getAdminInfo(): AdminInfo | null {
  const raw = localStorage.getItem(ADMIN_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setAdminInfo(admin: AdminInfo): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
}

export function getPermissions(): string[] {
  const raw = localStorage.getItem(PERMISSIONS_KEY)
  return raw ? JSON.parse(raw) : []
}

export function setPermissions(permissions: string[]): void {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
  localStorage.removeItem(PERMISSIONS_KEY)
}
