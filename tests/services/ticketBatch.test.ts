import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/core/request', () => ({ http }))

import { ticketService } from '@/services/tickets'

describe('ticketService batch status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the selected ids and status to the batch endpoint', async () => {
    http.post.mockResolvedValue({ updated: 3, skipped: 1 })

    const result = await ticketService.batchUpdateStatus([11, 12, 13, 14], 'resolved')

    expect(http.post).toHaveBeenCalledWith('/admin/tickets/batch-status', {
      ids: [11, 12, 13, 14],
      status: 'resolved',
    })
    expect(result).toEqual({ updated: 3, skipped: 1 })
  })

  it('keeps the single-ticket endpoint unchanged', async () => {
    http.put.mockResolvedValue({ id: 7, status: 'processing' })

    await ticketService.update(7, { status: 'processing' })

    expect(http.put).toHaveBeenCalledWith('/admin/tickets/7', { status: 'processing' })
  })
})
