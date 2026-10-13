import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { message } from 'antd'
import BatchOverrides from '@/pages/certification/components/vendors/nisp/BatchOverrides'
import { mergeSelectedRegistrations } from '@/pages/certification/components/vendors/nisp/BatchWorkbench'
import { nispService } from '@/services/nisp'
import type { NispBatch } from '@/services/nisp'

vi.mock('@/services/nisp', () => ({ nispService: {
  listBatches: vi.fn(), createExport: vi.fn(), cancelBatch: vi.fn(), updateBatch: vi.fn(),
} }))

const batch: NispBatch = {
  id: 42, plan_id: 8, level: '2', plan_name: 'NISP测试批次', plan_status: 'published',
  apply_start: null, apply_end: null, exam_date: null, exam_location: null,
  capacity: 10, occupied_count: 2, training_org: null, training_teacher: null,
  training_address: null, training_start: null, training_end: null,
  consultation_group_qrcode_url: '/api/media/nisp-consultation-group.png',
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

function renderBatch() {
  return render(
    <MemoryRouter>
      <BatchOverrides />
    </MemoryRouter>,
  )
}

  it('creates an export for the displayed batch and reports failures', async () => {
    vi.mocked(nispService.createExport).mockRejectedValueOnce(new Error('导出服务暂不可用'))
    renderBatch()
    fireEvent.click(await screen.findByRole('button', { name: '导 出' }))
    await waitFor(() => expect(nispService.createExport).toHaveBeenCalledWith(42, '2'))
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('导出服务暂不可用'))
    expect(screen.getByRole('button', { name: '导 出' })).not.toBeDisabled()
  })

  it('cancels only after confirmation and refreshes the list', async () => {
    vi.mocked(nispService.cancelBatch).mockResolvedValue({ ...batch, plan_status: 'cancelled' })
    renderBatch()
    fireEvent.click(await screen.findByRole('button', { name: '取消批次' }))
    expect(nispService.cancelBatch).not.toHaveBeenCalled()
    expect(await screen.findByText('未付款报名将关闭，已付款报名将进入待退款确认。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /OK|确 定/ }))
    await waitFor(() => expect(nispService.cancelBatch).toHaveBeenCalledWith(42))
    await waitFor(() => expect(nispService.listBatches).toHaveBeenCalledTimes(2))
  })

  it('opens the batch workbench from the primary action', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/certification/nisp']}>
        <Routes>
          <Route path='/admin/certification/nisp' element={<BatchOverrides />} />
          <Route path='/admin/certification/nisp/batches/:batchId' element={<div>nisp-workbench</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByText('管理报名'))
    expect(await screen.findByText('nisp-workbench')).toBeInTheDocument()
  })

  it('updates the NISP batch consultation group QR code', async () => {
    vi.mocked(nispService.updateBatch).mockResolvedValue(batch)
    renderBatch()

    fireEvent.click(await screen.findByRole('button', { name: '咨询群码' }))
    expect(await screen.findByText(/NISP 批次咨询群聊码/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存二维码' }))

    await waitFor(() => expect(nispService.updateBatch).toHaveBeenCalledWith(42, {
      consultation_group_qrcode_url: '/api/media/nisp-consultation-group.png',
    }))
  })

  it('opens the corresponding status filter from batch counters', async () => {
    vi.mocked(nispService.listBatches).mockResolvedValue({
      items: [{ ...batch, registration_counts: { pending_review: 2, approved: 5 } }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    render(
      <MemoryRouter initialEntries={['/admin/certification/nisp']}>
        <Routes>
          <Route path='/admin/certification/nisp' element={<BatchOverrides />} />
          <Route path='/admin/certification/nisp/batches/:batchId' element={<div>status-workbench</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByText('待初审 2'))
    expect(await screen.findByText('status-workbench')).toBeInTheDocument()
  })

  it('removes cancelled rows from the cross-page selection', () => {
    const first = { id: 1, registration_no: 'NISP-1-00000001' } as never
    const second = { id: 2, registration_no: 'NISP-1-00000002' } as never
    const selected = mergeSelectedRegistrations({}, [1, 2], [first, second])

    expect(Object.keys(selected)).toEqual(['1', '2'])
    expect(mergeSelectedRegistrations(selected, [2], [second])).toEqual({ 2: second })
    expect(mergeSelectedRegistrations(selected, [], [])).toEqual({})
  })
})
