import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/core/request', () => ({ http }))

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    http.get.mockResolvedValue({})
  })

  it('uses the daily reconciliation endpoint with an ISO date', async () => {
    const { orderService } = await import('@/services/orders')

    await orderService.reconciliation('2026-08-07')

    expect(http.get).toHaveBeenCalledWith('/admin/orders/reconciliation', {
      params: { date: '2026-08-07' },
    })
  })
})
