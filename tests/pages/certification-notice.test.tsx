import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { Modal } from 'antd'
import EnrollmentNoticeTab from '@/pages/certification/components/shared/EnrollmentNoticeTab'
import { certificationJourneyService } from '@/services/certificationJourney'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/certificationJourney', () => ({ certificationJourneyService: { catalog: vi.fn(), content: vi.fn(), save: vi.fn() } }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: ({ onUploadingChange, onChange }: { onUploadingChange: (active: boolean) => void; onChange: (url: string) => void }) => <span><button type='button' onClick={() => onUploadingChange(true)}>测试开始上传图片</button><button type='button' onClick={() => { onChange('/api/media/notice.png'); onUploadingChange(false) }}>测试完成上传图片</button></span> }))
const content = { version: 3, title: '报名须知', blocks: [{ type: 'text' as const, text: '请核对批次要求', url: '', caption: '' }], contact_name: '老师', contact_phone: '13800138000', contact_wechat: '', service_hours: '' }
beforeAll(() => {
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => computed(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} })) })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ permissions: ['*'], initialized: true })
  vi.mocked(certificationJourneyService.catalog).mockResolvedValue({ title: 'H3C', subjects: [{ id: 'H3C-A', name: '网络工程师' }], batches: [{ id: 5, plan_id: 12, subject_id: 'H3C-A', name: '十一月', status: 'published' }] })
  vi.mocked(certificationJourneyService.content).mockResolvedValue(content)
})
afterEach(() => { cleanup(); Modal.destroyAll() })

it('须知编辑携带当前版本保存，冲突时保留输入', async () => {
  vi.mocked(certificationJourneyService.save).mockRejectedValue(new Error('须知配置已更新，请刷新并核对后保存'))
  render(<EnrollmentNoticeTab type='h3c' />)
  const title = await screen.findByRole('textbox', { name: '须知标题' })
  await waitFor(() => expect(title).toHaveValue('报名须知'))
  fireEvent.change(title, { target: { value: '十一月报名须知' } })
  fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
  await waitFor(() => expect(certificationJourneyService.save).toHaveBeenCalledWith('h3c', expect.objectContaining({ version: 3, title: '十一月报名须知', contact_phone: '13800138000' }), undefined))
  expect(await screen.findByRole('alert')).toHaveTextContent('须知配置已更新')
  expect(title).toHaveValue('十一月报名须知')
})

it('切换有未保存内容的批次须明确放弃，保存绑定目标plan_id', async () => {
  vi.mocked(certificationJourneyService.save).mockResolvedValue({ ...content, version: 4 })
  render(<EnrollmentNoticeTab type='h3c' />)
  const title = await screen.findByRole('textbox', { name: '须知标题' })
  await waitFor(() => expect(title).toHaveValue('报名须知'))
  fireEvent.change(title, { target: { value: '未保存内容' } })
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '须知维护范围' }))
  fireEvent.click(await screen.findByText('网络工程师 · 十一月', { selector: '.ant-select-item-option-content' }))
  const dialog = await screen.findByRole('dialog')
  expect(certificationJourneyService.content).toHaveBeenCalledTimes(1)
  fireEvent.click(within(dialog).getByRole('button', { name: '放弃并切换' }))
  await waitFor(() => expect(certificationJourneyService.content).toHaveBeenLastCalledWith('h3c', 12))
  fireEvent.click(await screen.findByRole('button', { name: '保存设置' }))
  await waitFor(() => expect(certificationJourneyService.save).toHaveBeenCalledWith('h3c', expect.objectContaining({ version: 3 }), 12))
})

it('图片上传期间禁止保存和切换，完成上传后恢复操作', async () => {
  render(<EnrollmentNoticeTab type='h3c' />)
  await waitFor(() => expect(screen.getByRole('textbox', { name: '须知标题' })).toHaveValue('报名须知'))
  fireEvent.click(screen.getByRole('button', { name: /添加图片/ }))
  fireEvent.click(await screen.findByRole('button', { name: '测试开始上传图片' }))
  expect(screen.getByRole('button', { name: '图片上传中…' })).toBeDisabled()
  expect(screen.getByRole('combobox', { name: '须知维护范围' })).toBeDisabled()
  expect(certificationJourneyService.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '测试完成上传图片' }))
  expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled()
  expect(screen.getByRole('combobox', { name: '须知维护范围' })).toBeEnabled()
})
