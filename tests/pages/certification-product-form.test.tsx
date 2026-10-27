import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProductTable from '@/pages/certification/components/shared/ProductTable'

const mocks = vi.hoisted(() => ({ list: vi.fn(), getCatalog: vi.fn() }))
vi.mock('@/services/certProduct', () => ({ certProductService: mocks }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ admin: { role: 'super_admin' } }) }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: () => <div>封面上传</div> }))

const catalogItem = {
  id: 0, type: 'sangfor', code: 'SCSA-T', name: '安全技术认证工程师', instantiated: false, prices: [],
  duration_minutes: null, question_count: null, total_score: null, pass_score: null,
  cert_validity_years: null, prerequisite: null, remark: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
  mocks.getCatalog.mockResolvedValue([catalogItem])
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('uses a full-width Sangfor direction selector and omits an empty catalog metadata panel', async () => {
  render(<ProductTable type='sangfor' />)
  fireEvent.click(screen.getByRole('button', { name: /新增产品/ }))
  const direction = await screen.findByLabelText('报考方向')
  expect(direction.closest('.ant-col-24')).not.toBeNull()
  expect(screen.queryByRole('button', { name: /自定义编码/ })).toBeNull()
  expect(screen.getByText('请选择报考方向')).toBeTruthy()
  fireEvent.mouseDown(direction)
  fireEvent.click(await screen.findByText('SCSA-T · 安全技术认证工程师'))
  await waitFor(() => expect(screen.getByLabelText('名称')).toHaveValue('安全技术认证工程师'))
  expect(screen.queryByRole('note', { name: '产品目录信息' })).toBeNull()
})

it('retains populated metadata and the custom-code layout for H3C', async () => {
  mocks.getCatalog.mockResolvedValue([{ ...catalogItem, type: 'h3c', code: 'GB0-192', name: 'H3C网络工程师', duration_minutes: 60 }])
  render(<ProductTable type='h3c' />)
  fireEvent.click(screen.getByRole('button', { name: /新增产品/ }))
  const code = await screen.findByLabelText('产品编码')
  expect(code.closest('.ant-col-16')).not.toBeNull()
  expect(screen.getByRole('button', { name: /自定义编码/ })).toBeTruthy()
  fireEvent.mouseDown(code)
  fireEvent.click(await screen.findByText('GB0-192 · H3C网络工程师'))
  expect(await screen.findByRole('note', { name: '产品目录信息' })).toHaveTextContent('时长 60 分钟')
})
