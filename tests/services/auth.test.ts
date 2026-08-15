import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/core/request', () => ({
  http,
  isApiError: () => false,
}))

const now = '2026-08-15T08:00:00+08:00'
const admin = {
  id: 1,
  username: 'root.operator',
  display_name: '系统管理员',
  role: 'super_admin',
  is_active: true,
  must_change_password: false,
  locked_until: null,
  last_login_at: now,
  created_at: now,
  updated_at: now,
}

describe('administrator authentication response contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('strictly validates login, me and reauthentication session fields', async () => {
    const { authService } = await import('@/services/auth')
    http.post
      .mockResolvedValueOnce({
        access_token: 'signed-session-token',
        expires_in: 7200,
        admin,
        permissions: ['*'],
        session_mode: 'normal',
        must_change_password: false,
      })
      .mockResolvedValueOnce({ reauth_token: 'memory-only-token', expires_in: 600 })
    http.get.mockResolvedValueOnce({
      admin,
      permissions: ['*'],
      session_mode: 'normal',
      must_change_password: false,
    })

    await expect(authService.login('root.operator', 'current-password')).resolves.toMatchObject({
      session_mode: 'normal',
      admin: { role: 'super_admin' },
    })
    await expect(authService.me()).resolves.toMatchObject({ admin })
    await expect(authService.reauthenticate('current-password')).resolves.toEqual({
      reauth_token: 'memory-only-token',
      expires_in: 600,
    })
  })

  it('rejects legacy roles and undeclared token fields', async () => {
    const { authService } = await import('@/services/auth')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      http.get.mockResolvedValueOnce({
        admin: { ...admin, role: 'admin', auth_version: 9 },
        permissions: ['*'],
        session_mode: 'normal',
        must_change_password: false,
      })
      await expect(authService.me()).rejects.toThrow('API response validation failed')
    } finally {
      errorSpy.mockRestore()
    }
  })
})
