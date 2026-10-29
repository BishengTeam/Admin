import { afterEach, expect, it, vi } from 'vitest'
import { http } from '@/core/request'
import { refundWorkbenchService } from '@/services/refundWorkbench'

vi.mock('@/core/request', () => ({ http: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
afterEach(() => { vi.clearAllMocks() })

it('lists refund batch choices from every Renshe product instead of the legacy RS-ZY product', async () => {
  vi.mocked(http.get).mockResolvedValue([{ id: 12, name: '信息安全管理员批次', product_type: 'RS-ZY' }, { id: 35, name: '网络管理员批次', product_type: 'RS-OTHER' }])
  expect(await refundWorkbenchService.batchOptions('renshe')).toEqual([
    { value: 12, label: '信息安全管理员批次' }, { value: 35, label: '网络管理员批次' },
  ])
  expect(http.get).toHaveBeenCalledTimes(1)
  expect(http.get).toHaveBeenCalledWith('/admin/cert-products/renshe/batches')
})
