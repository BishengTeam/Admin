import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '@/core/request'
import { nispService } from '@/services/nisp'

vi.mock('@/core/request', () => ({ http: { get: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks() })

describe('NISP review batch API contract', () => {
  it('reads paginated searchable review options without using batch-management APIs', async () => {
    const result = { items: [{ id: 18, name: '历史考试批次', level: '2', status: 'archived' }], total: 21, page: 2, page_size: 20 }
    vi.mocked(http.get).mockResolvedValue(result)
    await expect(nispService.listReviewBatchOptions({ keyword: '历史', page: 2, page_size: 20 })).resolves.toEqual(result)
    expect(http.get).toHaveBeenCalledWith('/admin/nisp/review-batch-options', { params: { keyword: '历史', page: 2, page_size: 20 } })
  })
  it('passes the NISP batch ID and all existing registration filters together', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
    const params = { batch_id: 18, status: 'pending_review', payment_state: 'confirmed', keyword: '张', page: 1, page_size: 20 }
    await nispService.listRegistrations(params)
    expect(http.get).toHaveBeenCalledWith('/admin/nisp/registrations', { params })
  })
})
