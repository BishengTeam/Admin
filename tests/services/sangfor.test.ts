import { beforeEach, expect, it, vi } from 'vitest'
import { http } from '@/core/request'
import { sangforService } from '@/services/sangfor'

vi.mock('@/core/request', () => ({ http: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks() })

it('keeps registration and payment filters scoped to the selected Sangfor batch', async () => {
  const filters = { batch_id: 8, state: 'pending_review', payment_state: 'confirmed', page: 2, page_size: 20 }
  await sangforService.registrations(filters)
  expect(http.get).toHaveBeenCalledWith('/admin/cert-products/sangfor/registrations', { params: filters })
})

it('sends the current revision with review decisions and exports only explicitly selected rows after reauthentication', async () => {
  const command = { action: 'approve', expected_revision: 4 }
  await sangforService.review(7, command)
  expect(http.post).toHaveBeenCalledWith('/admin/cert-products/sangfor/registrations/7/review', command)
  await sangforService.export(8, [7, 9], 'reauth')
  expect(http.post).toHaveBeenCalledWith('/admin/cert-products/sangfor/batches/8/export', { registration_ids: [7, 9] }, { responseType: 'blob', headers: { 'X-Reauth-Token': 'reauth' } })
})
