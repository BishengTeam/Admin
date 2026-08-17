import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/core/request', () => ({ http }))

const now = '2026-08-15T08:00:00+08:00'
const account = {
  id: 7,
  username: 'quiz.ops',
  display_name: '题库运营',
  role: 'quiz_admin',
  is_active: true,
  must_change_password: false,
  locked_until: null,
  last_login_at: null,
  created_at: now,
  updated_at: now,
}
const mutation = {
  admin: { ...account, must_change_password: true },
  temporary_password: 'GeneratedSecureValue2026',
}

describe('administrator management service contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('sends the selected non-super role and the in-memory reauth header', async () => {
    const { adminManagementService } = await import('@/services/adminManagement')
    http.post.mockResolvedValueOnce(mutation)
    await adminManagementService.createAdmin(
      { username: 'quiz.ops', display_name: '题库运营', role: 'quiz_admin' },
      'reauth-1',
    )
    expect(http.post).toHaveBeenCalledWith(
      '/admin/settings/admins',
      { username: 'quiz.ops', display_name: '题库运营', role: 'quiz_admin' },
      {
        headers: {
          'X-Reauth-Token': 'reauth-1',
          'Idempotency-Key': expect.any(String),
        },
      },
    )
  })

  it('uses PATCH only for display name and dedicated POST action endpoints', async () => {
    const { adminManagementService } = await import('@/services/adminManagement')
    http.patch.mockResolvedValueOnce(account)
    http.post
      .mockResolvedValueOnce({ ...account, is_active: false })
      .mockResolvedValueOnce(mutation)
      .mockResolvedValueOnce(mutation)
      .mockResolvedValueOnce(account)

    await adminManagementService.updateDisplayName(7, '新显示名', 'reauth-2')
    await adminManagementService.disableAdmin(7, 'reauth-2')
    await adminManagementService.enableAdmin(7, 'reauth-2')
    await adminManagementService.resetPassword(7, 'reauth-2')
    await adminManagementService.unlockAdmin(7, 'reauth-2')

    expect(http.patch).toHaveBeenCalledWith(
      '/admin/settings/admins/7',
      { display_name: '新显示名' },
      { headers: { 'X-Reauth-Token': 'reauth-2' } },
    )
    for (const action of ['disable', 'unlock']) {
      expect(http.post).toHaveBeenCalledWith(
        `/admin/settings/admins/7/${action}`,
        {},
        { headers: { 'X-Reauth-Token': 'reauth-2' } },
      )
    }
    for (const action of ['enable', 'password-reset']) {
      expect(http.post).toHaveBeenCalledWith(
        `/admin/settings/admins/7/${action}`,
        {},
        {
          headers: {
            'X-Reauth-Token': 'reauth-2',
            'Idempotency-Key': expect.any(String),
          },
        },
      )
    }

    const credentialCalls = http.post.mock.calls.filter(([url]) => (
      url === '/admin/settings/admins/7/enable'
      || url === '/admin/settings/admins/7/password-reset'
    ))
    const keys = credentialCalls.map(([, , config]) => config.headers['Idempotency-Key'])
    expect(new Set(keys).size).toBe(2)
  })

  it('creates one non-persistent UUID idempotency key for each credential mutation action', async () => {
    const uuids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
    ] as const
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID')
    for (const uuid of uuids) randomUUID.mockReturnValueOnce(uuid)
    http.post.mockResolvedValue(mutation)
    const { adminManagementService } = await import('@/services/adminManagement')

    try {
      await adminManagementService.createAdmin(
        { username: 'quiz.one', display_name: '题库一组', role: 'quiz_admin' },
        'reauth-3',
      )
      await adminManagementService.createAdmin(
        { username: 'quiz.two', display_name: '题库二组', role: 'quiz_admin' },
        'reauth-3',
      )
      await adminManagementService.enableAdmin(7, 'reauth-3')
      await adminManagementService.resetPassword(7, 'reauth-3')

      const keys = http.post.mock.calls.map(([, , config]) => config.headers['Idempotency-Key'])
      expect(keys).toEqual(uuids)
      expect(randomUUID).toHaveBeenCalledTimes(4)
      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
    } finally {
      randomUUID.mockRestore()
    }
  })

  it('generates a standards-compliant UUID without persistence when randomUUID is unavailable', async () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index))
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })
    const { newAdminIdempotencyKey } = await import('@/services/adminManagement')

    try {
      expect(newAdminIdempotencyKey()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
      expect(getRandomValues).toHaveBeenCalledOnce()
      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('passes all frozen security-audit filters without adding write methods', async () => {
    const { adminManagementService } = await import('@/services/adminManagement')
    const signal = new AbortController().signal
    const params = {
      actor_admin_id: 1,
      target_admin_id: 7,
      action: 'admin_account.disable',
      result: 'succeeded' as const,
      username: 'quiz.ops',
      request_id: 'request-1',
      started_at: '2026-08-15T00:00:00Z',
      ended_at: '2026-08-16T00:00:00Z',
      page: 1,
      page_size: 20,
    }
    http.get.mockResolvedValueOnce({
      items: [{
        id: -31,
        action: 'admin_account.disable',
        result: 'succeeded',
        reason_code: 'legacy_event',
        actor_admin_id: 1,
        target_admin_id: 7,
        username: 'quiz.ops',
        request_id: 'request-1',
        source_ip: '100.64.0.3',
        user_agent: 'test-agent',
        summary: {},
        created_at: now,
      }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    await adminManagementService.listSecurityAudit(params, signal)
    expect(http.get).toHaveBeenCalledWith('/admin/settings/security-audit', { params, signal })
    expect(adminManagementService).not.toHaveProperty('deleteSecurityAudit')
  })

  it('rejects administrator responses that expose undeclared security fields', async () => {
    const { adminManagementService } = await import('@/services/adminManagement')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      http.get.mockResolvedValueOnce({
        items: [{ ...account, password_hash: 'must-never-cross-the-api' }],
        total: 1,
        page: 1,
        page_size: 20,
      })
      await expect(adminManagementService.listAdmins({})).rejects.toThrow(
        'API response validation failed',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})
