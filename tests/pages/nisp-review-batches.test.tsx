import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewTab from '@/pages/certification/components/vendors/nisp/ReviewTab'
import { nispService, type NispRegistration, type NispReviewBatchOption } from '@/services/nisp'

vi.mock('@/services/nisp', () => ({ nispService: { listRegistrations: vi.fn(), listReviewBatchOptions: vi.fn() } }))
vi.mock('@/pages/certification/components/vendors/nisp/RegistrationReviewDrawer', () => ({
  default: ({ open, batchLabel, registration, onClose, onReviewed }: {
    open: boolean; batchLabel?: string; registration: NispRegistration | null
    onClose: () => void; onReviewed: (row: NispRegistration) => Promise<void>
  }) => open && registration ? <div role='dialog' aria-label='原报名办理抽屉'>
    <span>{batchLabel}</span><span>{registration.registration_no}</span>
    <button onClick={onClose}>关闭办理</button>
    <button onClick={() => void onReviewed({ ...registration, status: 'approved' })}>完成原审核流程</button>
  </div> : null,
}))

const options: NispReviewBatchOption[] = [
  { id: 18, name: '同名考试批次', level: '2', status: 'archived' },
  { id: 37, name: '同名考试批次', level: '1', status: 'cancelled' },
]
const registration = (overrides: Partial<NispRegistration> = {}): NispRegistration => ({
  id: 7, registration_no: 'NISP-2-00000007', batch_id: 18, batch_name: '同名考试批次', level: '2',
  status: 'pending_review', candidate_snapshot: { name: '张三' }, order_status: 'paid', price_cents: 48000,
  resubmission_count: 0, rejection_count: 0, created_at: '2026-10-27T00:00:00Z', latest_review: null, materials: [],
  payment_summary: { order_id: 7, payment_channel: 'wechat', order_status: 'paid', offline_status: null,
    review_payment_allowed: true, review_block_reason: null }, ...overrides,
})

beforeAll(() => {
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) })
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(nispService.listReviewBatchOptions).mockResolvedValue({ items: options, total: 2, page: 1, page_size: 20 })
  vi.mocked(nispService.listRegistrations).mockImplementation(async params => ({
    items: [registration()], total: 61, page: params.page ?? 1, page_size: params.page_size ?? 20,
  }))
})
afterEach(cleanup)

const draw = () => render(<ReviewTab type='nisp' />)
const batchInput = () => screen.getByRole('combobox', { name: '所属批次' })
function visibleOption(text: string) {
  return Array.from(document.querySelectorAll<HTMLElement>('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option'))
    .find(element => element.textContent?.includes(text))
}
async function chooseBatch(id: number) {
  fireEvent.mouseDown(batchInput())
  await waitFor(() => expect(visibleOption(`批次 #${id}`)).toBeTruthy())
  fireEvent.click(visibleOption(`批次 #${id}`)!)
}
async function chooseFilter(placeholder: string, label: string) {
  const select = screen.getByText(placeholder, { selector: '.ant-select-selection-placeholder' }).closest('.ant-select')!
  fireEvent.mouseDown(within(select as HTMLElement).getByRole('combobox'))
  await waitFor(() => expect(visibleOption(label)).toBeTruthy())
  fireEvent.click(visibleOption(label)!)
}
function scrollOptions() {
  const holder = document.querySelector<HTMLElement>('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .rc-virtual-list-holder')!
  expect(holder).toBeTruthy()
  Object.defineProperties(holder, { scrollHeight: { configurable: true, value: 200 }, clientHeight: { configurable: true, value: 100 } })
  fireEvent.scroll(holder, { target: { scrollTop: 100 } })
}
const lastRequest = () => { const calls = vi.mocked(nispService.listRegistrations).mock.calls; return calls[calls.length - 1]?.[0] }

describe('NISP review batch context and filtering', () => {
  it('places the batch after the name, distinguishes same names and tolerates missing batch names', async () => {
    vi.mocked(nispService.listRegistrations).mockResolvedValue({ items: [
      registration(), registration({ id: 8, batch_id: 37, level: '1', candidate_snapshot: { name: '李四' } }),
      registration({ id: 9, batch_id: 55, batch_name: null, candidate_snapshot: { name: '王五' } }),
    ], total: 3, page: 1, page_size: 20 })
    draw()
    await screen.findByText('张三')
    const headings = screen.getAllByRole('columnheader').map(element => element.textContent)
    expect(headings.slice(0, 3)).toEqual(['姓名', '所属批次', '报名编号'])
    const first = screen.getByText('张三').closest('tr')!, second = screen.getByText('李四').closest('tr')!
    expect(within(first).getByText('同名考试批次')).toBeInTheDocument()
    expect(within(first).getByText('NISP二级 · 批次 #18')).toBeInTheDocument()
    expect(within(second).getByText('NISP一级 · 批次 #37')).toBeInTheDocument()
    expect(within(screen.getByText('王五').closest('tr')!).getByText('批次 #55')).toBeInTheDocument()
    fireEvent.click(within(first).getByRole('button', { name: '办理' }))
    expect(within(screen.getByRole('dialog')).getByText('同名考试批次 · NISP二级 · 批次 #18')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '完成原审核流程' }))
    await waitFor(() => expect(nispService.listRegistrations).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('intersects batch IDs with the existing filters, resets pagination and clears only the batch', async () => {
    draw()
    await screen.findByText('张三')
    await chooseFilter('核账状态', '核账通过')
    await chooseFilter('报名审核状态', '待初审')
    const search = screen.getByPlaceholderText('姓名 / 报名编号')
    fireEvent.change(search, { target: { value: '张' } })
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter', keyCode: 13 })
    await waitFor(() => expect(lastRequest()).toMatchObject({ status: 'pending_review', payment_state: 'confirmed', keyword: '张', page: 1 }))
    fireEvent.click(screen.getByTitle('2'))
    await waitFor(() => expect(lastRequest()?.page).toBe(2))
    await chooseBatch(18)
    await waitFor(() => expect(lastRequest()).toMatchObject({ batch_id: 18, status: 'pending_review', payment_state: 'confirmed', keyword: '张', page: 1 }))
    expect(lastRequest()).not.toHaveProperty('plan_id')
    // Archived and cancelled batches are valid historical audit filters.
    await chooseBatch(37)
    await waitFor(() => expect(lastRequest()?.batch_id).toBe(37))
    fireEvent.click(screen.getByTitle('2'))
    await waitFor(() => expect(lastRequest()?.page).toBe(2))
    const clear = batchInput().closest('.ant-select')!.querySelector<HTMLElement>('.ant-select-clear')!
    fireEvent.mouseDown(clear)
    await waitFor(() => expect(lastRequest()).toMatchObject({ batch_id: undefined, status: 'pending_review', payment_state: 'confirmed', keyword: '张', page: 1 }))
  })

  it('appends a remote second page, searches after debounce and preserves the complete selected label', async () => {
    vi.mocked(nispService.listReviewBatchOptions).mockImplementation(async params => ({
      items: params.keyword ? [{ id: 80, name: '搜索结果批次', level: '2', status: 'published' }]
        : params.page === 2 ? [{ id: 51, name: '第二页考试批次', level: '1', status: 'finalized' }] : options,
      total: params.keyword ? 1 : 3, page: params.page ?? 1, page_size: 20,
    }))
    draw()
    await chooseBatch(18)
    fireEvent.mouseDown(batchInput())
    scrollOptions()
    await waitFor(() => expect(nispService.listReviewBatchOptions).toHaveBeenCalledWith({ page: 2, page_size: 20, keyword: undefined }))
    await waitFor(() => expect(visibleOption('第二页考试批次')).toBeTruthy())
    expect(visibleOption('批次 #18')).toBeTruthy()
    fireEvent.change(batchInput(), { target: { value: '搜索' } })
    expect(nispService.listReviewBatchOptions).not.toHaveBeenCalledWith(expect.objectContaining({ keyword: '搜索' }))
    await waitFor(() => expect(nispService.listReviewBatchOptions).toHaveBeenCalledWith({ page: 1, page_size: 20, keyword: '搜索' }))
    await waitFor(() => expect(visibleOption('搜索结果批次')).toBeTruthy())
    fireEvent.keyDown(batchInput(), { key: 'Escape', keyCode: 27 })
    expect(batchInput().closest('.ant-select')!.querySelector('.ant-select-selection-item')).toHaveTextContent('同名考试批次 · NISP二级 · #18')
    expect(lastRequest()?.batch_id).toBe(18)
  })

  it('shows a recoverable remote error and ignores stale search responses', async () => {
    const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
    const old = deferred<{ items: NispReviewBatchOption[]; total: number; page: number; page_size: number }>()
    vi.mocked(nispService.listReviewBatchOptions).mockRejectedValueOnce(new Error('fixture failure'))
    draw()
    fireEvent.mouseDown(batchInput())
    expect(await screen.findByText('批次加载失败，请重试')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试加载批次' }))
    await waitFor(() => expect(visibleOption('批次 #18')).toBeTruthy())
    vi.mocked(nispService.listReviewBatchOptions).mockImplementation(async params => params.keyword === '旧' ? old.promise : ({
      items: [{ id: 90, name: '新查询结果', level: '1', status: 'published' }], total: 1, page: 1, page_size: 20,
    }))
    fireEvent.change(batchInput(), { target: { value: '旧' } })
    await waitFor(() => expect(nispService.listReviewBatchOptions).toHaveBeenCalledWith(expect.objectContaining({ keyword: '旧' })))
    fireEvent.change(batchInput(), { target: { value: '新' } })
    await waitFor(() => expect(visibleOption('新查询结果')).toBeTruthy())
    await act(async () => old.resolve({ items: [{ id: 91, name: '过期查询结果', level: '2', status: 'published' }], total: 1, page: 1, page_size: 20 }))
    expect(visibleOption('新查询结果')).toBeTruthy()
    expect(visibleOption('过期查询结果')).toBeUndefined()
  })
})
