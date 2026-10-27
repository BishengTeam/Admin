import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { message } from 'antd'
import BatchOverrides from '@/pages/certification/components/vendors/sangfor/BatchOverrides'

const mocks = vi.hoisted(() => ({ batches: vi.fn(), list: vi.fn(), createBatch: vi.fn(), updateBatch: vi.fn(), batchAction: vi.fn() }))
vi.mock('@/services/sangfor', async importOriginal => ({ ...await importOriginal<typeof import('@/services/sangfor')>(), sangforService: mocks }))
vi.mock('@/services/certProduct', () => ({ certProductService: { list: mocks.list } }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
const batch = { id: 5, name: '深信服11月考试', product_code: 'SCSA-T', product_name: '安全技术认证工程师', exam_direction: '安全技术认证工程师 SCSA-T', status: 'published',
  apply_start: '2030-11-01T00:00:00Z', apply_end: '2030-11-10T00:00:00Z', exam_date: '2030-11-20T00:00:00Z', price_cents: 12345, enrolled: 2, capacity: 10,
  registration_counts: { pending_review: 1, returned: 1 } }

beforeEach(() => {
  vi.clearAllMocks(); window.sessionStorage.clear()
  mocks.batches.mockResolvedValue([batch, { ...batch, id: 6, name: '深信服12月考试', status: 'draft', registration_counts: {} }])
  mocks.list.mockResolvedValue({ items: [{ id: 1, code: 'SCSA-T', chinese_name: '安全技术认证工程师', is_active: true }] })
  vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
  vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as ReturnType<typeof message.error>)
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('uses the same searchable colored batch list and grouped drawer as NISP', async () => {
  render(<MemoryRouter><BatchOverrides /></MemoryRouter>)
  expect(await screen.findByText('深信服11月考试')).toBeTruthy()
  expect(screen.getByText('已发布').closest('.ant-tag')).toHaveClass('ant-tag-green')
  expect(screen.getAllByRole('button', { name: '管理报名' })).toHaveLength(2)
  expect(screen.getAllByRole('button', { name: /更多/ })).toHaveLength(2)
  const search = screen.getByPlaceholderText('搜索批次名称')
  fireEvent.change(search, { target: { value: '12月' } }); fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' })
  await waitFor(() => expect(screen.queryByText('深信服11月考试')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: /新建批次/ }))
  expect(await screen.findByText('新建深信服考试批次')).toBeTruthy()
  for (const title of ['① 报考方向', '② 基本信息', '③ 报名安排', '④ 考试安排']) expect(screen.getByText(title)).toBeTruthy()
  expect(screen.queryByText('⑤ 报名要求预览')).toBeNull()
  expect(screen.getByRole('button', { name: '保存草稿' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '保存并发布' })).toBeTruthy()
})

it('refreshes available products on every new-batch opening without resetting list filters', async () => {
  render(<MemoryRouter><BatchOverrides /></MemoryRouter>)
  await screen.findByText('深信服11月考试')
  const search = screen.getByPlaceholderText('搜索批次名称')
  fireEvent.change(search, { target: { value: '12月' } }); fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' })
  await waitFor(() => expect(screen.queryByText('深信服11月考试')).toBeNull())

  mocks.list.mockResolvedValue({ items: [
    { id: 1, code: 'SCSA-T', chinese_name: '已下架产品', is_active: false },
    { id: 2, code: 'SCSA-S', chinese_name: '新上架产品', is_active: true },
  ] })
  fireEvent.click(screen.getByRole('button', { name: /新建批次/ }))
  const drawer = await screen.findByRole('dialog', { name: '新建深信服考试批次' })
  expect(await within(drawer).findByText('SCSA-S · 新上架产品')).toBeTruthy()
  expect(mocks.list).toHaveBeenCalledTimes(2)
  expect(within(drawer).queryByText('SCSA-T · 已下架产品')).toBeNull()
  expect(screen.queryByText('深信服11月考试')).toBeNull()
  fireEvent.click(within(drawer).getByRole('button', { name: /取\s*消/ }))

  mocks.list.mockResolvedValue({ items: [{ id: 3, code: 'SCSP-S', chinese_name: '再次新建的产品', is_active: true }] })
  fireEvent.click(screen.getByRole('button', { name: /新建批次/ }))
  expect(await screen.findByText('SCSP-S · 再次新建的产品')).toBeTruthy()
  expect(mocks.list).toHaveBeenCalledTimes(3)
})

it('blocks submission while loading or after a product failure and retries without losing form input', async () => {
  render(<MemoryRouter><BatchOverrides /></MemoryRouter>)
  await screen.findByText('深信服11月考试')
  let fail!: (reason: Error) => void
  mocks.list.mockReturnValueOnce(new Promise((_, reject) => { fail = reject }))
  fireEvent.click(screen.getByRole('button', { name: /新建批次/ }))
  const drawer = await screen.findByRole('dialog', { name: '新建深信服考试批次' })
  const save = within(drawer).getByRole('button', { name: '保存草稿' })
  expect(save).toBeDisabled()
  expect(within(drawer).getByRole('button', { name: '保存并发布' })).toBeDisabled()
  fireEvent.change(within(drawer).getByLabelText('批次名称'), { target: { value: '保留填写的批次名称' } })
  await act(async () => { fail(new Error('network failed')) })
  expect(await within(drawer).findByText('产品加载失败，请重试')).toBeTruthy()
  expect(save).toBeDisabled()
  fireEvent.click(save)
  expect(mocks.createBatch).not.toHaveBeenCalled()

  fireEvent.click(within(drawer).getByRole('button', { name: '重新加载产品' }))
  await waitFor(() => expect(save).not.toBeDisabled())
  expect(within(drawer).getByLabelText('批次名称')).toHaveValue('保留填写的批次名称')
  expect(within(drawer).getByText('SCSA-T · 安全技术认证工程师')).toBeTruthy()
})

it('keeps the bound product name visible when editing a historical batch whose product is missing', async () => {
  render(<MemoryRouter><BatchOverrides /></MemoryRouter>)
  await screen.findByText('深信服12月考试')
  mocks.list.mockResolvedValue({ items: [] })
  fireEvent.click(screen.getAllByRole('button', { name: /更多/ })[1])
  fireEvent.click(await screen.findByText('编辑批次'))
  const drawer = await screen.findByRole('dialog', { name: '编辑深信服批次 · 深信服12月考试' })
  expect(within(drawer).getByText('SCSA-T · 安全技术认证工程师')).toBeTruthy()
  expect(within(drawer).getByLabelText('认证产品')).toBeDisabled()
  expect(within(drawer).getByRole('button', { name: '保存修改' })).not.toBeDisabled()
})

it('opens the real counter-filtered workbench and preserves the batch-list search context', async () => {
  render(<MemoryRouter initialEntries={['/admin/certification/sangfor']}><Routes>
    <Route path='/admin/certification/sangfor' element={<BatchOverrides />} />
    <Route path='/admin/certification/sangfor/batches/:batchId' element={<div>filtered-workbench</div>} />
  </Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: '待初审 1' }))
  expect(await screen.findByText('filtered-workbench')).toBeTruthy()
  expect(JSON.parse(window.sessionStorage.getItem('sangfor.batch-list.context') || '{}')).toEqual(expect.objectContaining({ page: 1, pageSize: 20 }))
})
