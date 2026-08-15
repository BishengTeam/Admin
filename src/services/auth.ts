import axios from 'axios'
import { http, isApiError } from '@/core/request'
import {
  AdminAuthSessionSchema,
  AdminMeSchema,
  parseAdminResponse,
  ReauthResponseSchema,
} from '@/core/adminValidation'
import type {
  AdminAuthSession,
  AdminMe,
  ChangePasswordPayload,
  ReauthResponse,
} from '@/types/admin'

export const authService = {
  async login(username: string, password: string): Promise<AdminAuthSession> {
    return parseAdminResponse(
      AdminAuthSessionSchema,
      await http.post('/admin/auth/login', { username, password }),
    )
  },

  async logout(): Promise<void> {
    return http.post<void>('/admin/auth/logout')
  },

  async me(): Promise<AdminMe> {
    return parseAdminResponse(AdminMeSchema, await http.get('/admin/auth/me'))
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    return http.post<void>('/admin/auth/change-password', payload)
  },

  async reauthenticate(password: string): Promise<ReauthResponse> {
    return parseAdminResponse(
      ReauthResponseSchema,
      await http.post('/admin/auth/reauth', { password }),
    )
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
  if (isApiError(error)) {
    switch (error.status) {
      case 401:
        return { type: 'unauthorized', message: error.message || '用户名或密码错误' }
      case 403:
        return { type: 'forbidden', message: error.message || '账号已被禁用，请联系管理员' }
      case 429:
        return { type: 'rate_limited', message: error.message || '操作过于频繁，请稍后再试' }
      default:
        return { type: error.status == null ? 'network' : 'unknown', message: error.message || '登录失败' }
    }
  }
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
