import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { message } from 'antd'
import BatchWorkbench from '@/pages/certification/components/vendors/sangfor/BatchWorkbench'

const mocks = vi.hoisted(() => ({ batch: vi.fn(), registrations: vi.fn(), registration: vi.fn(), review: vi.fn(), reauth: vi.fn(), exports: vi.fn(), export: vi.fn(), download: vi.fn() }))
vi.mock('@/services/sangfor', async importOriginal => ({ ...await importOriginal<typeof import('@/services/sangfor')>(), sangforService: mocks }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: mocks.reauth, reauthDialog: null }) }))
vi.mock('@/utils/download', () => ({ downloadBlob: mocks.download }))
vi.mock('@/components/PageContainer', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/pages/orders/components/OfflinePaymentSection', () => ({ default: () => <div>现有银行核账组件</div> }))

const record = { id: 7, order_id: 7, batch_id: 5, registration_no: 'SF-7', revision: 3, current_version: 2, status: 'pending_review', order_status: 'paid', created_at: '2026-10-27T00:00:00Z',
  candidate_snapshot: { name: '实名考生', first_name: 'Xiaofu', last_name: 'Shen', exam_voucher_code: 'VENDOR-123' }, batch_snapshot: {},
  versions: [], reviews: [], exports: [], payment_summary: { order_id: 7, payment_channel: 'bank_transfer', order_status: 'paid', offline_status: 'confirmed', review_payment_allowed: true, review_block_reason: null } }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.batch.mockResolvedValue({ id: 5, name: '测试批次', exam_direction: '安全技术认证工程师 SCSA-T', price_cents: 12345, registration_counts: { pending_review: 1 } })
  mocks.exports.mockResolvedValue([])
  mocks.registrations.mockResolvedValue({ items: [record], total: 1, page: 1, page_size: 20 })
  mocks.registration.mockResolvedValue(record)
  mocks.review.mockResolvedValue({ ...record, status: 'approved', revision: 4 })
  vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
  vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as ReturnType<typeof message.error>)
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

async function open() {
  render(<MemoryRouter initialEntries={['/batches/5']}><Routes><Route path='/batches/:batchId' element={<BatchWorkbench />} /></Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: '办理' }))
  await waitFor(() => expect(mocks.registration).toHaveBeenCalledWith(7))
}

it('uses the existing payment-first drawer and blocks review until receipt confirmation', async () => {
  mocks.registration.mockResolvedValue({ ...record, status: 'pending_payment', payment_summary: { ...record.payment_summary, review_payment_allowed: false } })
  await open()
  expect(await screen.findByText('现有银行核账组件')).toBeTruthy()
  expect(screen.getByRole('tab', { name: '② 报名审核' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.queryByRole('button', { name: '初审通过' })).toBeNull()
})

it('displays real pinyin and vendor voucher, then submits only a version-checked initial review', async () => {
  await open()
  expect(await screen.findByText('VENDOR-123')).toBeTruthy()
  expect(screen.getByText('Xiaofu')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '初审通过' }))
  fireEvent.click(screen.getByRole('button', { name: '保存审核结果' }))
  await waitFor(() => expect(mocks.review).toHaveBeenCalledWith(7, { action: 'approve', expected_revision: 3, reason: '', correction_due_at: null }))
  expect(screen.queryByRole('button', { name: '登记外审通过' })).toBeNull()
})

it('does not send an empty correction reason or omit the correction deadline', async () => {
  await open()
  fireEvent.click(await screen.findByRole('button', { name: '打回补正' }))
  fireEvent.click(screen.getByRole('button', { name: '保存审核结果' }))
  expect(await screen.findByText('请指出需要补正的字段和原因')).toBeTruthy()
  expect(await screen.findByText('请选择补正截止时间')).toBeTruthy()
  expect(mocks.review).not.toHaveBeenCalled()
})

it('clears conflicting registration filters for the pending-receipt shortcut', async () => {
  render(<MemoryRouter initialEntries={['/batches/5']}><Routes><Route path='/batches/:batchId' element={<BatchWorkbench />} /></Routes></MemoryRouter>)
  await screen.findByRole('button', { name: '办理' })
  fireEvent.click(screen.getByRole('button', { name: '待审核' }))
  await waitFor(() => expect(mocks.registrations).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'pending_review', payment_state: 'confirmed', page: 1 })))
  fireEvent.click(screen.getByRole('button', { name: '待核账' }))
  await waitFor(() => expect(mocks.registrations).toHaveBeenLastCalledWith(expect.objectContaining({ state: undefined, payment_state: 'under_review', page: 1 })))
})

it('loads real export records and the refund list in the same workbench tabs', async () => {
  mocks.exports.mockResolvedValue([{ id: 'export-1', created_at: '2026-10-27T00:00:00Z', sha256: 'hash', people_count: 1,
    people: [{ registration_id: 7, registration_no: 'SF-7', name: '实名考生', version: 2, is_current: true }] }])
  render(<MemoryRouter initialEntries={['/batches/5']}><Routes><Route path='/batches/:batchId' element={<BatchWorkbench />} /></Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('tab', { name: '导出记录' }))
  expect(await screen.findByText('报名信息.xlsx')).toBeTruthy()
  expect(mocks.exports).toHaveBeenCalledWith(5)
  fireEvent.click(screen.getByRole('button', { name: /查看人员/ }))
  expect(await within(screen.getByRole('dialog', { name: '导出记录人员' })).findByText('第2版')).toBeTruthy()
  fireEvent.click(within(screen.getByRole('dialog', { name: '导出记录人员' })).getByRole('button', { name: /关\s*闭/ }))
  fireEvent.click(screen.getByRole('tab', { name: '退款记录' }))
  await waitFor(() => expect(mocks.registrations).toHaveBeenCalledWith(expect.objectContaining({ batch_id: 5, refund_only: true })))
})

it('previews the selected people before authentication and exports the selected versions', async () => {
  mocks.registrations.mockResolvedValue({ items: [{ ...record, status: 'approved' }], total: 1, page: 1, page_size: 20 })
  mocks.reauth.mockResolvedValue('reauth-fixture')
  mocks.export.mockResolvedValue(new Blob(['fixture']))
  render(<MemoryRouter initialEntries={['/batches/5']}><Routes><Route path='/batches/:batchId' element={<BatchWorkbench />} /></Routes></MemoryRouter>)
  await screen.findByRole('button', { name: '办理' })
  const checkboxes = screen.getAllByRole('checkbox')
  fireEvent.click(checkboxes[checkboxes.length - 1])
  fireEvent.click(screen.getByRole('button', { name: /导出所选报名信息/ }))
  expect(screen.getByRole('dialog', { name: '确认导出报名信息（1人）' })).toBeTruthy()
  expect(mocks.reauth).not.toHaveBeenCalled()
  expect(mocks.export).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '二次验证并导出' }))
  await waitFor(() => expect(mocks.export).toHaveBeenCalledWith(5, [7], 'reauth-fixture', { 7: 2 }))
  await waitFor(() => expect(mocks.download).toHaveBeenCalled())
})
