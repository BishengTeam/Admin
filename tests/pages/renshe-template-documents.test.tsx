import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Modal, message } from 'antd'
import { ApiError } from '@/core/request'
import RensheCommitmentTemplates from '@/pages/operations/documents/RensheCommitmentTemplates'

const mocks = vi.hoisted(() => ({ list: vi.fn(), upload: vi.fn(), save: vi.fn(), download: vi.fn(), permissions: ['*'] }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ permissions: mocks.permissions }) }))
vi.mock('@/services/renshe', () => ({ rensheService: { listProjects: mocks.list, uploadCommitmentTemplate: mocks.upload, saveCommitmentTemplate: mocks.save, downloadCommitmentTemplate: mocks.download } }))
vi.mock('@/utils/download', () => ({ downloadBlob: vi.fn() }))
const old = { filename: `commitment_${'a'.repeat(64)}.pdf`, sha256: 'a'.repeat(64), original_filename: '甲产品当前.pdf', size_bytes: 1024 }
const next = { filename: `commitment_${'b'.repeat(64)}.docx`, sha256: 'b'.repeat(64), original_filename: '新空白模板.docx', size_bytes: 2048 }
const products = [
  { id: 1, chinese_name: '甲产品', version: 3, config: { occupation_name: '信息安全管理员', skill_level: '中级工', commitment_template: old }, commitment_template: old },
  { id: 2, chinese_name: '乙产品', version: 5, config: { occupation_name: '网络安全管理员', skill_level: '中级工' } },
]
beforeEach(() => {
  mocks.permissions = ['*']; mocks.list.mockReset().mockResolvedValue(structuredClone(products)); mocks.upload.mockReset().mockResolvedValue(next)
  mocks.save.mockReset().mockResolvedValue({ ...products[0], version: 4, commitment_template: next, config: { ...products[0].config, commitment_template: next } })
  mocks.download.mockReset().mockResolvedValue(new Blob(['%PDF-fixture'], { type: 'application/pdf' }))
  vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); Modal.destroyAll(); vi.restoreAllMocks() })
async function open(search = '') {
  const view = render(<MemoryRouter initialEntries={['/admin/content/documents' + search]}><RensheCommitmentTemplates /></MemoryRouter>)
  await screen.findByText('甲产品当前.pdf')
  return view
}
async function upload(container: HTMLElement, filename = '新空白模板.docx') {
  const file = new File(['fixture'], filename)
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
  await screen.findByText('文件已上传，保存后生效')
}

it('upload stays unbound; download uses the saved file; save targets one product and its version', async () => {
  const { container } = await open()
  await upload(container)
  expect(mocks.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /下载当前模板/ }))
  await waitFor(() => expect(mocks.download).toHaveBeenCalledWith(old.filename))
  const save = screen.getByRole('button', { name: '保存设置' })
  await waitFor(() => expect(save).toBeEnabled())
  fireEvent.click(save); fireEvent.click(save)
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  expect(mocks.save).toHaveBeenCalledWith(1, next, 3)
  await waitFor(() => expect(message.success).toHaveBeenCalledWith('承诺书模板已更新'))
  expect(screen.queryByText('文件已上传，保存后生效')).toBeNull()
})

it('confirms discard before changing products and cannot save the pending file on another product', async () => {
  const { container } = await open()
  await upload(container)
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '人社产品' }))
  fireEvent.click(await screen.findByText('乙产品 · 网络安全管理员／中级工', { selector: '.ant-select-item-option-content' }))
  expect(await screen.findByText(/当前上传的模板尚未保存/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }))
  expect(screen.getByText('新空白模板.docx')).toBeTruthy()
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '人社产品' }))
  fireEvent.click(await screen.findByText('乙产品 · 网络安全管理员／中级工', { selector: '.ant-select-item-option-content' }))
  fireEvent.click(await screen.findByRole('button', { name: '放弃并切换' }))
  expect(await screen.findByText('尚未配置承诺书模板')).toBeTruthy()
  expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled()
  expect(mocks.save).not.toHaveBeenCalled()
})

it('keeps pending input and version on a save conflict, and requires explicit reload', async () => {
  mocks.save.mockRejectedValue(new ApiError({ status: 409, message: 'stale' }))
  const { container } = await open()
  await upload(container)
  fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
  expect(await screen.findByText(/请重新加载后核对/)).toBeTruthy()
  expect(screen.getByText('新空白模板.docx')).toBeTruthy()
  expect(mocks.list).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /刷新产品/ }))
  expect(await screen.findByText(/重新加载会放弃尚未保存/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }))
  expect(mocks.list).toHaveBeenCalledTimes(1)
})

it('hides the section without read permission and leaves read-only users unable to upload or save', async () => {
  mocks.permissions = ['document:read']
  const view = render(<MemoryRouter><RensheCommitmentTemplates /></MemoryRouter>)
  expect(screen.queryByText('人社承诺书空白模板')).toBeNull()
  expect(mocks.list).not.toHaveBeenCalled()
  cleanup()
  mocks.permissions = ['content:read', 'content:list']
  await open()
  expect(screen.getByRole('button', { name: /上传替换/ })).toBeDisabled()
  expect(screen.queryByRole('button', { name: '保存设置' })).toBeNull()
  expect(screen.getByRole('button', { name: /下载当前模板/ })).toBeEnabled()
})

it('shows upload errors next to the file and does not bind a failed upload', async () => {
  mocks.upload.mockRejectedValue(new Error('承诺书模板DOCX格式不正确'))
  const { container } = await open()
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['bad'], 'wrong.docx')] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('DOCX格式不正确')
  expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled()
  expect(mocks.save).not.toHaveBeenCalled()
})

it.each(['wrong.txt', 'empty.pdf', 'oversized.pdf'])('rejects %s before upload', async name => {
  const { container } = await open()
  const file = new File([name === 'empty.pdf' ? '' : 'fixture'], name)
  if (name === 'oversized.pdf') Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 })
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('模板仅支持PDF／DOCX，文件不能为空，最大10 MB')
  expect(mocks.upload).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
})
