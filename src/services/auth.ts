import { http } from '@/core/request'
import type { AdminInfo } from '@/types/admin'

export const authService = {
  async login(username: string, password: string): Promise<{ access_token: string; admin: AdminInfo; permissions: string[] }> {
    return http.post<{ access_token: string; admin: AdminInfo; permissions: string[] }>('/admin/auth/login', { username, password })
  },

  async logout(): Promise<void> {
    return http.post<void>('/admin/auth/logout')
  },

  async me(): Promise<{ admin: AdminInfo; permissions: string[] }> {
    return http.get<{ admin: AdminInfo; permissions: string[] }>('/admin/auth/me')
  },
}
