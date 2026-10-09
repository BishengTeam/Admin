import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '@/core/request'
import { nispService } from '@/services/nisp'

vi.mock('@/core/request', () => ({ http: { post: vi.fn() } }))

describe('NISP operations', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates an authenticated asynchronous export with the selected batch and level', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 12, status: 'queued' })
    const job = await nispService.createExport(42, '2')
    expect(http.post).toHaveBeenCalledWith('/admin/nisp/export', {
      batch_id: 42, level: '2', include_statuses: ['approved'],
    })
    expect(job.id).toBe(12)
  })

  it('preserves rejected material types for user resubmission', async () => {
    const decision = { decision: 'rejected' as const, reason_detail: '照片不清晰',
      rejected_material_types: ['portrait_photo' as const] }
    await nispService.reviewRegistration(7, decision)
    expect(http.post).toHaveBeenCalledWith('/admin/nisp/registrations/7/review', decision)
  })
})
