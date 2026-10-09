import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { message } from 'antd'
import BatchOverrides from '@/pages/certification/components/vendors/nisp/BatchOverrides'
import { nispService } from '@/services/nisp'
import type { NispBatch } from '@/services/nisp'

vi.mock('@/services/nisp', () => ({ nispService: {
  listBatches: vi.fn(), createExport: vi.fn(), cancelBatch: vi.fn(),
} }))

const batch: NispBatch = {
  id: 42, plan_id: 8, level: '2', plan_name: 'NISP测试批次', plan_status: 'published',
  apply_start: null, apply_end: null, exam_date: null, exam_location: null,
  capacity: 10, occupied_count: 2, training_org: null, training_teacher: null,
  training_address: null, training_start: null, training_end: null,
  level1_price_cents: 0, level2_price_cents: 100, created_at: '', updated_at: '',
}

beforeAll(() => {
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) })
})

describe('NISP batch operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(nispService.listBatches).mockResolvedValue({ items: [batch], total: 1, page: 1, page_size: 20 })
    vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
    vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as ReturnType<typeof message.error>)
  })
  afterEach(cleanup)

  it('creates an export for the displayed batch and reports failures', async () => {
    vi.mocked(nispService.createExport).mockRejectedValueOnce(new Error('导出服务暂不可用'))
    render(<BatchOverrides />)
    fireEvent.click(await screen.findByRole('button', { name: '导 出' }))
    await waitFor(() => expect(nispService.createExport).toHaveBeenCalledWith(42, '2'))
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('导出服务暂不可用'))
    expect(screen.getByRole('button', { name: '导 出' })).not.toBeDisabled()
  })

  it('cancels only after confirmation and refreshes the list', async () => {
    vi.mocked(nispService.cancelBatch).mockResolvedValue({ ...batch, plan_status: 'cancelled' })
    render(<BatchOverrides />)
    fireEvent.click(await screen.findByRole('button', { name: '取消批次' }))
    expect(nispService.cancelBatch).not.toHaveBeenCalled()
    expect(await screen.findByText('未付款报名将关闭，已付款报名将进入待退款确认。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /OK|确 定/ }))
    await waitFor(() => expect(nispService.cancelBatch).toHaveBeenCalledWith(42))
    await waitFor(() => expect(nispService.listBatches).toHaveBeenCalledTimes(2))
  })
})
