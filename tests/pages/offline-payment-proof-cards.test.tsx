import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import OfflinePaymentSection from '@/pages/orders/components/OfflinePaymentSection'

const mocks = vi.hoisted(() => ({ permissions: ['offline:view'], detail: vi.fn(), content: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ permissions: mocks.permissions }) }))
vi.mock('@/pages/orders/components/OfflineDecisionModal', () => ({ default: () => null }))
vi.mock('@/services/offlinePayment', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/offlinePayment')>(),
  offlinePaymentService: { detail: mocks.detail, content: mocks.content },
}))

const imageName = 'tmp_7e0a88ed965ee9be56b1e5ac6ff909a03563f5209f5fe5e8.jpg'
const pdfName = 'tmp_98738.pdf'
const payment = {
  order_id: 34, order_status: 'pending', amount_cents: 111100, current_version: 2,
  status: 'under_review', status_label: '待核账', out_trade_no: 'OF-34', deadline: null, message: null,
  account: { account_name: '测试收款公司', bank_name: '测试银行', account_number: '6222000011112222' },
  entries: [], audits: [], materials: [
    { id: 11, filename: imageName, size_bytes: 1024, content_type: 'image/jpeg' },
    { id: 12, filename: pdfName, size_bytes: 2048, content_type: 'application/pdf' },
  ],
  submissions: [{ version: 2, created_at: '2026-10-28T00:00:00Z', transfer_time: '2026-10-28T00:00:00Z', payer: '测试付款人', amount_cents: 111100, status: 'under_review', bank_reference: '', note: '', reason: null, material_ids: [11, 12] }],
}

let visible: Array<(entries: { isIntersecting: boolean }[]) => void>
let downloadedNames: string[]
let createUrl: ReturnType<typeof vi.fn>
let revokeUrl: ReturnType<typeof vi.fn>

beforeEach(() => {
  visible = []; downloadedNames = []
  mocks.permissions = ['offline:view']; mocks.detail.mockReset(); mocks.content.mockReset()
  mocks.detail.mockResolvedValue(payment)
  mocks.content.mockImplementation(async (_order: number, id: number) => new Blob(['test evidence'], { type: id === 12 ? 'application/pdf' : 'image/jpeg' }))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { visible.push(callback) }
    observe() {}
    disconnect() {}
  })
  createUrl = vi.fn().mockImplementation(() => `blob:proof-${createUrl.mock.calls.length}`)
  revokeUrl = vi.fn()
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(value: Blob | MediaSource): string { return createUrl(value) as string }
    static revokeObjectURL(value: string): void { revokeUrl(value) }
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloadedNames.push(this.download) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('shared certification reconciliation proof cards', () => {
  it.each(['h3c', 'nisp', 'renshe', 'sangfor'])('uses business labels and authenticated image/PDF previews in the %s workbench', async vendor => {
    mocks.detail.mockResolvedValue({ ...payment, business_link: { vendor, registration_id: 9, batch_id: 3 } })
    render(<OfflinePaymentSection orderId={34} mode='registration' />)
    expect(await screen.findByText('转账凭证 1')).toBeTruthy()
    expect(screen.getByText('转账凭证 2')).toBeTruthy()
    expect(screen.queryByText(imageName)).toBeNull()
    expect(screen.queryByText(pdfName)).toBeNull()
    expect(screen.getByText('图片 · 1.0 KiB')).toBeTruthy()
    expect(screen.getByText('PDF · 2.0 KiB')).toBeTruthy()
    expect(mocks.content).not.toHaveBeenCalled()
    await act(async () => visible.forEach(callback => callback([{ isIntersecting: true }])))
    const image = await screen.findByAltText('转账凭证 1')
    expect(image).toHaveAttribute('src', 'blob:proof-1')
    expect(mocks.content).toHaveBeenCalledWith(34, 11)
    expect(mocks.content).not.toHaveBeenCalledWith(34, 12)
    fireEvent.click(image)
    expect(await screen.findByText('转账凭证 1 · 版本 2')).toBeTruthy()
    expect(mocks.content).toHaveBeenCalledTimes(1)
  })

  it('opens PDFs only on demand and preserves the original filename when downloading', async () => {
    render(<OfflinePaymentSection orderId={34} mode='registration' />)
    await screen.findByText('转账凭证 2')
    fireEvent.click(screen.getAllByRole('button', { name: /预览/ })[1])
    expect(await screen.findByTitle('转账凭证 2 · 版本 2')).toHaveAttribute('src', 'blob:proof-1')
    expect(mocks.content).toHaveBeenCalledWith(34, 12)
    fireEvent.click(screen.getAllByRole('button', { name: /下载/ })[1])
    await waitFor(() => expect(downloadedNames).toEqual([pdfName]))
    expect(screen.queryByText(pdfName)).toBeNull()
  })

  it('retries a failed image request without exposing a raw filename', async () => {
    mocks.content.mockRejectedValueOnce(new Error('凭证读取失败，请重试'))
    render(<OfflinePaymentSection orderId={34} mode='registration' />)
    await screen.findByText('转账凭证 1')
    await act(async () => visible.forEach(callback => callback([{ isIntersecting: true }])))
    expect(await screen.findByText('凭证读取失败，请重试')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '重 试' }))
    expect(await screen.findByAltText('转账凭证 1')).toHaveAttribute('src', 'blob:proof-1')
    expect(mocks.content).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(imageName)).toBeNull()
  })

  it('discards an old order response and releases only the URLs it actually created', async () => {
    let finish!: (value: Blob) => void
    mocks.content.mockImplementationOnce(() => new Promise<Blob>(resolve => { finish = resolve }))
    const view = render(<OfflinePaymentSection key={34} orderId={34} mode='registration' />)
    await screen.findByText('转账凭证 1')
    await act(async () => visible.forEach(callback => callback([{ isIntersecting: true }])))
    mocks.detail.mockResolvedValue({ ...payment, order_id: 35 })
    visible = []
    view.rerender(<OfflinePaymentSection key={35} orderId={35} mode='registration' />)
    await screen.findByText('转账凭证 1')
    await act(async () => visible.forEach(callback => callback([{ isIntersecting: true }])))
    expect(await screen.findByAltText('转账凭证 1')).toHaveAttribute('src', 'blob:proof-1')
    await act(async () => finish(new Blob(['old order image'], { type: 'image/jpeg' })))
    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(mocks.content).toHaveBeenCalledWith(35, 11)
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith('blob:proof-1')
  })

  it('does not load thumbnails or financial evidence without the independent view permission', () => {
    mocks.permissions = ['h3c:review']
    render(<OfflinePaymentSection orderId={34} mode='registration' />)
    expect(screen.getByText('线下凭证需要独立查看权限。')).toBeTruthy()
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(mocks.content).not.toHaveBeenCalled()
    expect(visible).toHaveLength(0)
  })
})
