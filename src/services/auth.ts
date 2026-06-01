import axios from 'axios'
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

export interface LoginError {
  type: 'unauthorized' | 'forbidden' | 'rate_limited' | 'network' | 'unknown'
  message: string
}

/**
 * 将原始错误（通常是 axios 错误）规范化为 LoginError。
 * Page 层只消费 LoginError，不感知 HTTP 状态码。
 */
export function normalizeLoginError(error: unknown): LoginError {
  if (!axios.isAxiosError(error) || !error.response) {
    return { type: 'network', message: '网络连接失败，请检查网络' }
  }
  const status = error.response.status
  const detail: string | undefined = error.response.data?.detail

  switch (status) {
    case 401:
      return { type: 'unauthorized', message: detail || '用户名或密码错误' }
    case 403:
      return { type: 'forbidden', message: detail || '账号已被禁用，请联系管理员' }
    case 429:
      return { type: 'rate_limited', message: detail || '操作过于频繁，请稍后再试' }
    default:
      return { type: 'unknown', message: detail || '登录失败' }
  }
}
