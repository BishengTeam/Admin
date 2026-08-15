import { describe, expect, it } from 'vitest'
import { getAdminStatus } from '@/pages/settings/admins'
import { sanitizeAuditValue } from '@/pages/settings/security-audit'
import type { AdminAccount } from '@/types/admin'

const admin: AdminAccount = {
  id: 2,
  username: 'quiz.ops',
  display_name: '题库运营',
  role: 'quiz_admin',
  is_active: true,
  must_change_password: false,
  locked_until: null,
  last_login_at: null,
  created_at: '2026-08-15T00:00:00Z',
  updated_at: '2026-08-15T00:00:00Z',
}

describe('administrator security presentation', () => {
  it('derives the composite status without collapsing orthogonal backend fields', () => {
    expect(getAdminStatus(admin).text).toBe('正常')
    expect(getAdminStatus({ ...admin, must_change_password: true }).text).toBe('待首次改密')
    expect(getAdminStatus({ ...admin, locked_until: '2099-01-01T00:00:00Z' }).text).toBe('临时锁定')
    expect(getAdminStatus({ ...admin, is_active: false, locked_until: '2099-01-01T00:00:00Z' }).text).toBe('已停用')
  })

  it('redacts credential-shaped keys before rendering audit summaries', () => {
    expect(sanitizeAuditValue({
      changed_fields: ['display_name'],
      password: 'never-render-this',
      nested: { access_token: 'never-render-this-either', reason: 'manual' },
    })).toEqual({
      changed_fields: ['display_name'],
      password: '[已脱敏]',
      nested: { access_token: '[已脱敏]', reason: 'manual' },
    })
  })
})
