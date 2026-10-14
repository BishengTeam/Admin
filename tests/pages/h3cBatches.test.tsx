import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import BatchOverrides from '@/pages/certification/components/vendors/h3c/BatchOverrides'
import { mergeSelectedRegistrations } from '@/pages/certification/components/vendors/h3c/BatchExportWorkbench'
import { certProductService } from '@/services/certProduct'
import { h3cService } from '@/services/h3c'
import type { CertProduct } from '@/types/certProduct'
import type { H3cExamBatch } from '@/types/h3c'

vi.mock('@/services/h3c', () => ({
  h3cService: {
    listBatches: vi.fn(),
    createBatch: vi.fn(),
    updateBatch: vi.fn(),
    publishBatch: vi.fn(),
    closeBatchRegistration: vi.fn(),
    finalizeBatch: vi.fn(),
    archiveBatch: vi.fn(),
    cancelBatch: vi.fn(),
  },
}))

vi.mock('@/services/certProduct', () => ({
  certProductService: {
    list: vi.fn(),
  },
}))

vi.mock('@/hooks/useReauthentication', () => ({
  useReauthentication: () => ({
    ensureReauthenticated: vi.fn(),
    reauthDialog: null,
  }),
}))

function product(overrides: Partial<CertProduct> = {}): CertProduct {
  return {
    id: 1,
    type: 'h3c',
    code: 'H3CNE',
    name: 'H3C Certified Network Engineer',
    chinese_name: 'H3C网络工程师',
    description: null,
    home_cover_url: null,
    is_active: true,
    sort_order: 0,
    prices: [],
    created_at: '2026-09-01 00:00:00',
    updated_at: '2026-09-01 00:00:00',
    ...overrides,
  }
}

function batch(overrides: Partial<H3cExamBatch> = {}): H3cExamBatch {
  return {
    id: 1,
    plan_id: 10,
    certification_code: 'H3CNE',
    name: '9月H3CNE批次',
    status: 'published',
    apply_start: '2026-09-01T00:00:00Z',
    apply_end: '2026-09-10T00:00:00Z',
    exam_date: '2026-09-20T09:00:00Z',
    capacity: 60,
    occupied_count: 12,
    remaining_count: 48,
    exam_location: null,
    description: null,
    sort_order: 0,
    exam_code: 'NE-2609',
    identity_tag: 'student',
    country: 'CN',
    language: 'zh',
    training_org: null,
    training_teacher: null,
    training_address: null,
    training_start: null,
    training_end: null,
    payment_timeout_minutes: 30,
    resubmission_window_hours: 72,
    max_resubmissions: 2,
    max_material_bytes: 10485760,
    prices: [{ registration_type: 'coupon', price_cents: 10000 }],
    published_at: '2026-09-01T00:00:00Z',
    registration_closed_at: null,
    cancelled_at: null,
    finalized_at: null,
    created_at: '2026-09-01 00:00:00',
    updated_at: '2026-09-01 00:00:00',
    ...overrides,
  }
}

beforeAll(() => {
  const nativeGetComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => (
    nativeGetComputedStyle(element)
  ))

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('H3C BatchOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(h3cService.listBatches).mockResolvedValue({
      items: [
        batch(),
        batch({ id: 2, certification_code: 'LEGACY-X', name: '已下线认证批次', exam_code: 'LG-01' }),
      ],
      total: 2,
      page: 1,
      page_size: 20,
    })
    vi.mocked(certProductService.list).mockResolvedValue({
      items: [product()],
      total: 1,
      page: 1,
      page_size: 100,
    })
  })

afterEach(cleanup)

function renderBatch() {
  render(
    <MemoryRouter>
      <BatchOverrides type='h3c' productCode={null} />
    </MemoryRouter>,
  )
}

  it('renders all batches without requiring a selected product', async () => {
    renderBatch()

    expect(await screen.findByText('9月H3CNE批次')).toBeInTheDocument()
    expect(screen.getByText('已下线认证批次')).toBeInTheDocument()
    expect(screen.queryByText(/请先在上方选择认证产品/)).not.toBeInTheDocument()
    expect(h3cService.listBatches).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  it('maps the certification column to product names with code fallback', async () => {
    renderBatch()

    await screen.findByText('9月H3CNE批次')
    expect(screen.getByText('H3C网络工程师')).toBeInTheDocument()
    expect(screen.getByText('LEGACY-X')).toBeInTheDocument()
    expect(certProductService.list).toHaveBeenCalledWith({ type: 'h3c', page: 1, page_size: 100 })
  })

  it('archives finished batches from the secondary menu', async () => {
    vi.mocked(h3cService.listBatches).mockResolvedValue({
      items: [batch({ id: 3, status: 'finalized', name: '已结束批次' })],
      total: 1,
      page: 1,
      page_size: 20,
    })
    vi.mocked(h3cService.archiveBatch).mockResolvedValue(batch({ status: 'archived' }))

    renderBatch()

    await screen.findByText('已结束批次')
    fireEvent.click(await screen.findByRole('button', { name: /更多/ }))
    fireEvent.click(await screen.findByText('归档批次'))
    expect(await screen.findByText('归档后用户端不再显示该批次。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '归档批次' }))
    await waitFor(() => expect(h3cService.archiveBatch).toHaveBeenCalledWith(3))
  })

  it('shows the grouped H3C batch form with three registration types', async () => {
    renderBatch()
    fireEvent.click(await screen.findByRole('button', { name: /新建批次/ }))

    expect(await screen.findByText('新建 H3C 考试批次')).toBeInTheDocument()
    expect(screen.getByText('① 认证产品')).toBeInTheDocument()
    expect(screen.getByText('② 基本信息')).toBeInTheDocument()
    expect(screen.getByText('③ 报名安排')).toBeInTheDocument()
    expect(screen.getByText('④ 考试安排')).toBeInTheDocument()
    expect(screen.getByText('⑤ 报名类型与费用')).toBeInTheDocument()
    expect(screen.getAllByText('考券报名').length).toBeGreaterThan(0)
    expect(screen.getAllByText('学生报名').length).toBeGreaterThan(0)
    expect(screen.getAllByText('全额报名').length).toBeGreaterThan(0)
    expect(screen.getByText('考生需填写有效考券编号，并上传考券证明材料。')).toBeInTheDocument()
    expect(screen.getByText('考生需填写学籍在线验证码，并上传学生证明材料。')).toBeInTheDocument()
    expect(screen.getByText('考生仅填写基础报名信息，无需考券或学生证明材料。')).toBeInTheDocument()
    expect(screen.queryByText('身份标签')).not.toBeInTheDocument()
    expect(screen.queryByText('单图上限（MB）')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存草稿' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存并发布' })).toBeInTheDocument()
  })

  it('links each batch to the dedicated batch workbench', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/certification/h3c']}>
        <Routes>
          <Route path='/admin/certification/h3c' element={<BatchOverrides type='h3c' productCode={null} />} />
          <Route path='/admin/certification/h3c/batches/:batchId' element={<div>batch-workbench</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click((await screen.findAllByText('管理报名'))[0])
    expect(await screen.findByText('batch-workbench')).toBeInTheDocument()
  })

  it('opens the corresponding status filter from batch counters', async () => {
    vi.mocked(h3cService.listBatches).mockResolvedValue({
      items: [batch({ registration_counts: { pending_review: 2, approved: 5 } })],
      total: 1,
      page: 1,
      page_size: 20,
    })
    render(
      <MemoryRouter initialEntries={['/admin/certification/h3c']}>
        <Routes>
          <Route path='/admin/certification/h3c' element={<BatchOverrides type='h3c' productCode={null} />} />
          <Route path='/admin/certification/h3c/batches/:batchId' element={<div>status-workbench</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByText('待初审 2'))
    expect(await screen.findByText('status-workbench')).toBeInTheDocument()
  })

  it('removes rows from the selection when their keys are cancelled', () => {
    const first = { id: 1, registration_no: 'H3C-1' } as never
    const second = { id: 2, registration_no: 'H3C-2' } as never
    const previous = mergeSelectedRegistrations({}, [1, 2], [first, second])

    expect(Object.keys(previous)).toEqual(['1', '2'])
    expect(mergeSelectedRegistrations(previous, [2], [second])).toEqual({ 2: second })
    expect(mergeSelectedRegistrations(previous, [], [])).toEqual({})
  })
})
