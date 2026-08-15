import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getToken, setToken } from '@/core/auth'
import type { AdminInfo } from '@/types/admin'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  changePassword: vi.fn(),
  reauthenticate: vi.fn(),
}))

vi.mock('@/services/auth', () => ({
  authService: mocks,
  normalizeLoginError: (error: unknown) => error,
}))

const admin: AdminInfo = {
  id: 2,
  username: 'quiz.ops',
  display_name: '题库运营',
  role: 'quiz_admin',
  is_active: true,
  must_change_password: true,
  locked_until: null,
  last_login_at: null,
  created_at: '2026-08-15T00:00:00Z',
  updated_at: '2026-08-15T00:00:00Z',
}

describe('authStore server-authoritative state', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.setState({
      token: null,
      admin: null,
      permissions: [],
      sessionMode: null,
      mustChangePassword: false,
      initialized: false,
    })
  })

  it('records a restricted login and exposes the forced-password-change state', async () => {
    mocks.login.mockResolvedValue({
      access_token: 'restricted-token',
      expires_in: 7200,
      admin,
      permissions: [],
      session_mode: 'restricted',
      must_change_password: true,
    })
    const { useAuthStore } = await import('@/stores/authStore')

    await useAuthStore.getState().login('quiz.ops', 'temporary-password')

    expect(getToken()).toBe('restricted-token')
    expect(useAuthStore.getState()).toMatchObject({
      sessionMode: 'restricted',
      mustChangePassword: true,
      initialized: true,
      permissions: [],
    })
  })

  it('clears the token and stale permissions whenever /me cannot confirm them', async () => {
    setToken('old-token')
    mocks.me.mockRejectedValue(new Error('network unavailable'))
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.setState({
      token: 'old-token',
      admin,
      permissions: ['*'],
      sessionMode: 'normal',
      mustChangePassword: false,
      initialized: false,
    })

    await useAuthStore.getState().initFromServer()

    expect(getToken()).toBeNull()
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      admin: null,
      permissions: [],
      initialized: false,
    })
  })

  it('clears all local authentication state after a successful password change', async () => {
    setToken('active-token')
    mocks.changePassword.mockResolvedValue(undefined)
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.setState({
      token: 'active-token',
      admin,
      permissions: ['quiz:list'],
      sessionMode: 'normal',
      initialized: true,
    })

    await useAuthStore.getState().changePassword({
      current_password: 'old-password-1',
      new_password: 'new-password-2',
      confirm_password: 'new-password-2',
    })

    expect(mocks.changePassword).toHaveBeenCalledOnce()
    expect(getToken()).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('clears local authentication state but reports when server logout is not confirmed', async () => {
    const logoutFailure = new Error('revocation store unavailable')
    setToken('active-token')
    mocks.logout.mockRejectedValue(logoutFailure)
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.setState({
      token: 'active-token',
      admin,
      permissions: ['quiz:list'],
      sessionMode: 'normal',
      initialized: true,
    })

    await expect(useAuthStore.getState().logout()).rejects.toBe(logoutFailure)

    expect(getToken()).toBeNull()
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      admin: null,
      permissions: [],
      sessionMode: null,
      initialized: false,
    })
  })
})
