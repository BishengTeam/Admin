import request from '@/core/request'
import type { AdminInfo } from '@/types/admin'

export const authService = {
  async login(username: string, password: string): Promise<{ token: string; admin: AdminInfo; permissions: string[] }> {
    return request.post('/admin/auth/login', { username, password })
  },

  async logout(): Promise<void> {
    return request.post('/admin/auth/logout')
  },
}
