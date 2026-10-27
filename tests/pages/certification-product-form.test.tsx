import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProductTable from '@/pages/certification/components/shared/ProductTable'
import { message } from 'antd'

const mocks = vi.hoisted(() => ({ list: vi.fn(), getCatalog: vi.fn(), create: vi.fn(), update: vi.fn(), importCatalog: vi.fn() }))
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
  mocks.create.mockResolvedValue({})
  mocks.update.mockResolvedValue({})
  vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
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

const historicalPrices = [{ user_type: 'student', price_cents: 50000 }, { user_type: 'normal', price_cents: 120000 }]
const h3cCatalog = { ...catalogItem, id: 17, type: 'h3c', code: 'GB0-192', name: 'H3C网络工程师', prices: historicalPrices }

it('creates an H3C product without product prices or hidden price fields', async () => {
  mocks.getCatalog.mockResolvedValue([h3cCatalog])
  render(<ProductTable type='h3c' />)
  expect(screen.queryByRole('columnheader', { name: '学生价' })).toBeNull()
  expect(screen.queryByRole('columnheader', { name: '普通价' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /新增产品/ }))
  fireEvent.mouseDown(await screen.findByLabelText('产品编码'))
  fireEvent.click(await screen.findByText('GB0-192 · H3C网络工程师'))
  expect(screen.queryByLabelText('学生价')).toBeNull()
  expect(screen.queryByLabelText('普通价')).toBeNull()
  expect(screen.queryByText('价格配置（元）')).toBeNull()
  expect(screen.getAllByText('报名费用在各考试批次中设置。')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: /^创\s*建$/ }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
  const payload = mocks.create.mock.calls[0][0]
  expect(payload).toMatchObject({ type: 'h3c', code: 'GB0-192', chinese_name: 'H3C网络工程师' })
  for (const key of ['prices', 'student_price_yuan', 'normal_price_yuan']) expect(payload).not.toHaveProperty(key)
})

it('saves H3C display changes without sending an empty price list that disables historical prices', async () => {
  const product = { id: 1, code: 'GB0-192', type: 'h3c', name: 'h3cne', chinese_name: 'H3C网络工程师',
    is_active: true, description: '', home_cover_url: null, prices: historicalPrices }
  mocks.list.mockResolvedValue({ items: [product], total: 1, page: 1, page_size: 20 })
  mocks.getCatalog.mockResolvedValue([h3cCatalog])
  render(<ProductTable type='h3c' />)
  fireEvent.click(await screen.findByRole('button', { name: '编辑' }))
  fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新的产品展示名称' } })
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))
  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
  expect(mocks.update.mock.calls[0][0]).toBe('GB0-192')
  const payload = mocks.update.mock.calls[0][1]
  expect(payload).toMatchObject({ chinese_name: '新的产品展示名称' })
  for (const key of ['prices', 'student_price_yuan', 'normal_price_yuan']) expect(payload).not.toHaveProperty(key)
  expect(product.prices).toEqual(historicalPrices)
})

it('keeps existing product pricing for other vendors', async () => {
  mocks.getCatalog.mockResolvedValue([{ ...h3cCatalog, type: 'nisp', code: 'NISP-1', name: 'NISP一级' }])
  render(<ProductTable type='nisp' />)
  expect(screen.getByRole('columnheader', { name: '学生价' })).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '普通价' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /新增产品/ }))
  fireEvent.mouseDown(await screen.findByLabelText('产品编码'))
  fireEvent.click(await screen.findByText('NISP-1 · NISP一级'))
  expect(screen.getByLabelText('学生价')).toHaveValue('500.00')
  expect(screen.getByLabelText('普通价')).toHaveValue('1200.00')
  fireEvent.click(screen.getByRole('button', { name: /^创\s*建$/ }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
  expect(mocks.create.mock.calls[0][0]).toMatchObject({ type: 'nisp', prices: historicalPrices })
})

it('explains that imported reference prices do not change batch fees', async () => {
  mocks.importCatalog.mockResolvedValue({ created_count: 1, updated_count: 2, price_upserted_count: 3 })
  const { container } = render(<ProductTable type='h3c' />)
  expect(screen.getByRole('button', { name: /导入产品目录/ })).toBeTruthy()
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['fixture'], '产品目录.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })] } })
  await waitFor(() => expect(mocks.importCatalog).toHaveBeenCalledOnce())
  await waitFor(() => expect(message.success).toHaveBeenCalledWith('产品目录已导入：新增 1 项，更新 2 项。表内价格仅作历史参考，报名费用请在批次中设置。'))
})
