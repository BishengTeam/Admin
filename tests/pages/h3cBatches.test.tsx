import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import BatchOverrides from '@/pages/certification/components/vendors/h3c/BatchOverrides'
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

  it('renders all batches without requiring a selected product', async () => {
    render(<BatchOverrides type='h3c' productCode={null} />)

    expect(await screen.findByText('9月H3CNE批次')).toBeInTheDocument()
    expect(screen.getByText('已下线认证批次')).toBeInTheDocument()
    expect(screen.queryByText(/请先在上方选择认证产品/)).not.toBeInTheDocument()
    expect(h3cService.listBatches).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  it('maps the certification column to product names with code fallback', async () => {
    render(<BatchOverrides type='h3c' productCode={null} />)

    await screen.findByText('9月H3CNE批次')
    expect(screen.getByText('H3C网络工程师')).toBeInTheDocument()
    expect(screen.getByText('LEGACY-X')).toBeInTheDocument()
    expect(certProductService.list).toHaveBeenCalledWith({ type: 'h3c', page: 1, page_size: 100 })
  })
})
