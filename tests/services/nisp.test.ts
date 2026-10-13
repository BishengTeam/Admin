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

  it('creates a complete level-specific batch without exposing Plan IDs', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 42 })
    const batch = await nispService.createFullBatch({
      level: '2',
      name: 'NISP二级 · 2026年11月考试批次',
      apply_start: '2026-11-01T02:00:00Z',
      apply_end: '2026-11-10T02:00:00Z',
      exam_date: '2026-11-20T02:00:00Z',
      capacity: 30,
      price_cents: 48000,
      publish: true,
    })
    expect(http.post).toHaveBeenCalledWith('/admin/nisp/batches/full', {
      level: '2',
      name: 'NISP二级 · 2026年11月考试批次',
      apply_start: '2026-11-01T02:00:00Z',
      apply_end: '2026-11-10T02:00:00Z',
      exam_date: '2026-11-20T02:00:00Z',
      exam_location: undefined,
      training_org: undefined,
      consultation_group_qrcode_url: undefined,
      capacity: 30,
      price_cents: 48000,
      max_resubmissions: undefined,
      payment_timeout_minutes: undefined,
      resubmission_window_hours: undefined,
      publish: true,
    })
    expect(batch.id).toBe(42)
  })
})
