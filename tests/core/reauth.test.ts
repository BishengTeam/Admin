import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearReauthCredential, getReauthToken, setReauthCredential } from '@/core/reauth'

describe('in-memory reauthentication credential', () => {
  beforeEach(() => {
    clearReauthCredential()
    vi.restoreAllMocks()
  })

  it('keeps the token only in memory and expires it at the server-provided deadline', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    setReauthCredential('reauth-token', 600)

    expect(getReauthToken()).toBe('reauth-token')
    expect(localStorage.getItem('reauth-token')).toBeNull()

    vi.spyOn(Date, 'now').mockReturnValue(601_000)
    expect(getReauthToken()).toBeNull()
  })

  it('can be explicitly cleared on logout or session invalidation', () => {
    setReauthCredential('reauth-token', 600)
    clearReauthCredential()
    expect(getReauthToken()).toBeNull()
  })
})
