import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Modal, message } from 'antd'
import { ApiError } from '@/core/request'
import OfflineSettingsModal from '@/pages/orders/components/OfflineSettingsModal'
import { ACCOUNT_ERROR, CONTACT_ERROR } from '@/utils/offlineSettings'

const mocks = vi.hoisted(() => ({ settings: vi.fn(), save: vi.fn(), reauth: vi.fn(), role: 'super_admin', permissions: ['*'], close: vi.fn() }))
vi.mock('@/services/offlinePayment', () => ({ offlinePaymentService: { settings: mocks.settings, saveSettings: mocks.save } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ admin: { id: 1, role: mocks.role }, permissions: mocks.permissions }) }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: mocks.reauth, reauthDialog: null }) }))
const settings = {
  account_name: '测试收款单位', bank_name: '测试银行营业部', account_number: '0012345678901234567890123456789012345678',
  transfer_note: '转账请备注订单号', contact_name: '测试管理员', contact_phone: '028-12345678', contact_wechat: '', service_hours: '',
  submit_hours: 24, correction_hours: 48, version: 3,
}
beforeEach(() => {
  mocks.settings.mockReset().mockResolvedValue({ ...settings }); mocks.save.mockReset().mockResolvedValue({ ...settings, version: 4 })
  mocks.reauth.mockReset().mockResolvedValue('test-grant'); mocks.close.mockReset(); mocks.role = 'super_admin'; mocks.permissions = ['*']
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, writable: true, value: vi.fn() })
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() })
})
afterEach(() => { cleanup(); Modal.destroyAll(); vi.restoreAllMocks() })
async function open() {
  const view = render(<OfflineSettingsModal open onClose={mocks.close} />)
  await waitFor(() => expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled())
  return view
}
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: '保存设置' }))

it.each(['1', '1234 5678', '1234-5678', '１２３４５６７８', '1'.repeat(41)])('invalid account %s fails inline before reauthentication', async value => {
  await open(); change('银行账号', value); save()
  expect(await screen.findByText(ACCOUNT_ERROR)).toBeTruthy()
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.getByLabelText('银行账号')).toHaveFocus())
})

it('preserves account digits and leading zeroes, trims edges, and prevents duplicate save requests', async () => {
  let resolve!: (token: string) => void
  mocks.reauth.mockImplementation(() => new Promise<string>(done => { resolve = done }))
  const success = vi.spyOn(message, 'success')
  await open(); change('银行账号', `  ${settings.account_number}  `); change('收款户名', '  测试收款单位  ')
  save(); save()
  await waitFor(() => expect(mocks.reauth).toHaveBeenCalledTimes(1))
  expect(mocks.save).not.toHaveBeenCalled()
  await act(async () => resolve('test-grant'))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ account_number: settings.account_number, account_name: settings.account_name, version: 3 }), 'test-grant')
  expect(success).toHaveBeenCalledWith('银行收款设置已保存')
  expect(mocks.close).toHaveBeenCalledTimes(1)
})

it('requires one contact and clears linked errors when WeChat is supplied', async () => {
  await open(); change('联系电话', '  '); change('联系微信', '  '); save()
  expect((await screen.findAllByText(CONTACT_ERROR)).length).toBeGreaterThan(0)
  expect(mocks.reauth).not.toHaveBeenCalled()
  change('联系微信', '  office_wechat  ')
  await waitFor(() => expect(screen.queryByText(CONTACT_ERROR)).toBeNull())
  save()
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ contact_phone: '', contact_wechat: 'office_wechat' }), 'test-grant'))
})

it.each(['首次凭证提交期限（小时）', '默认凭证补交期限（小时）'])('rejects decimal values for %s', async label => {
  await open(); change(label, '1.5'); save()
  expect(await screen.findByText(label.startsWith('首次') ? '请输入1～168之间的整数' : '请输入1～336之间的整数')).toBeTruthy()
  expect(mocks.reauth).not.toHaveBeenCalled()
})

it.each([[1, 1], [168, 336]])('accepts deadline boundaries %i / %i', async (first, correction) => {
  await open(); change('首次凭证提交期限（小时）', String(first)); change('默认凭证补交期限（小时）', String(correction)); save()
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ submit_hours: first, correction_hours: correction }), 'test-grant'))
})

it('maps 422 errors into known fields and keeps other server errors until their fields change', async () => {
  mocks.save.mockRejectedValue(new ApiError({ status: 422, message: '参数校验失败', fields: [
    { loc: ['body', 'account_number'], msg: 'String should match pattern' }, { field: 'contact_phone', reason: 'String should have at most 32 characters' },
    { field: 'future_setting', reason: 'Unknown server rule' },
  ] }))
  await open(); save()
  expect(await screen.findByText(ACCOUNT_ERROR)).toBeTruthy()
  expect(screen.getByText('联系电话填写不符合要求，最多32字符')).toBeTruthy()
  expect(screen.getByText(/future_setting/)).toBeTruthy()
  change('银行账号', '0012345678')
  await waitFor(() => expect(screen.queryByText(ACCOUNT_ERROR)).toBeNull())
  expect(screen.getByText('联系电话填写不符合要求，最多32字符')).toBeTruthy()
  expect(mocks.close).not.toHaveBeenCalled()
})

it('places root contact errors in the contact section', async () => {
  mocks.save.mockRejectedValue(new ApiError({ status: 422, message: '参数校验失败', fields: [{ field: '', reason: 'Value error, 至少配置电话或微信联系方式' }] }))
  await open(); save()
  expect(await screen.findByText(CONTACT_ERROR)).toBeTruthy()
  expect(screen.getByText(CONTACT_ERROR).closest('section')).toHaveAccessibleName('管理员联系方式')
})

it('version conflict preserves input and requires explicit reload without retrying PUT', async () => {
  mocks.save.mockRejectedValue(new ApiError({ status: 409, message: '收款设置已更新' }))
  await open(); change('收款户名', '未保存的新户名'); save()
  expect(await screen.findByText('设置已被其他管理员修改，请重新载入后核对')).toBeTruthy()
  expect(screen.getByLabelText('收款户名')).toHaveValue('未保存的新户名')
  save(); expect(mocks.save).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '重新载入' }))
  const dialog = await screen.findByText('重新载入会替换当前未保存的内容，请载入后重新核对。')
  expect(dialog).toBeTruthy()
  expect(mocks.settings).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '保留当前内容' }))
  await waitFor(() => expect(screen.queryByText('重新载入会替换当前未保存的内容，请载入后重新核对。')).toBeNull())
  expect(screen.getByLabelText('收款户名')).toHaveValue('未保存的新户名')
  fireEvent.click(screen.getByRole('button', { name: '重新载入' }))
  const confirmation = await screen.findByText('重新载入会替换当前未保存的内容，请载入后重新核对。')
  fireEvent.click(within(confirmation.closest('.ant-modal-content') as HTMLElement).getByRole('button', { name: '重新载入' }))
  await waitFor(() => expect(mocks.settings).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(screen.getByLabelText('收款户名')).toHaveValue(settings.account_name))
  expect(mocks.save).toHaveBeenCalledTimes(1)
})

it.each([null, new Error('network')])('cancelled authentication or failed save preserves form values', async failure => {
  if (failure === null) mocks.reauth.mockResolvedValue(null)
  else mocks.save.mockRejectedValue(failure)
  await open(); change('收款户名', '保留的户名'); save()
  await waitFor(() => expect(mocks.reauth).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled())
  expect(screen.getByLabelText('收款户名')).toHaveValue('保留的户名')
  expect(mocks.close).not.toHaveBeenCalled()
  if (failure === null) expect(mocks.save).not.toHaveBeenCalled()
  else expect(await screen.findByText(/当前输入已保留/)).toBeTruthy()
})

it('load failure blocks save and offers retry with fresh defaults', async () => {
  mocks.settings.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(null)
  render(<OfflineSettingsModal open onClose={mocks.close} />)
  expect(await screen.findByText('收款设置加载失败')).toBeTruthy()
  expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled())
  expect(screen.getByLabelText('首次凭证提交期限（小时）')).toHaveValue('24')
  expect(screen.getByLabelText('默认凭证补交期限（小时）')).toHaveValue('48')
})

it('view permission alone never allows editing or saving', async () => {
  mocks.role = 'cert_admin'; mocks.permissions = ['offline:settings']
  render(<OfflineSettingsModal open onClose={mocks.close} />)
  expect(await screen.findByDisplayValue(settings.account_name)).toBeDisabled()
  expect(screen.queryByRole('button', { name: '保存设置' })).toBeNull()
  expect(screen.getByRole('button', { name: '关 闭' })).toBeEnabled()
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled()
})

it('expired reauthentication keeps inputs and permits an explicit new attempt', async () => {
  mocks.save.mockRejectedValueOnce(new ApiError({ status: 403, message: '请重新验证当前管理员密码' })).mockResolvedValueOnce({ ...settings, version: 4 })
  await open(); change('收款户名', '待重新验证的户名'); save()
  expect(await screen.findByText('身份验证凭据失效或无修改权限，请重新验证后重试')).toBeTruthy()
  expect(screen.getByLabelText('收款户名')).toHaveValue('待重新验证的户名')
  expect(mocks.close).not.toHaveBeenCalled()
  save()
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2))
  expect(mocks.reauth).toHaveBeenCalledTimes(2)
})

it('late loading of a closed modal cannot overwrite a newly opened form', async () => {
  let finish!: (value: typeof settings) => void
  mocks.settings.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const view = render(<OfflineSettingsModal open onClose={mocks.close} />)
  view.rerender(<OfflineSettingsModal open={false} onClose={mocks.close} />)
  view.rerender(<OfflineSettingsModal open onClose={mocks.close} />)
  await waitFor(() => expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled())
  change('收款户名', '新窗口的输入')
  await act(async () => finish({ ...settings, account_name: '过期数据' }))
  expect(screen.getByLabelText('收款户名')).toHaveValue('新窗口的输入')
})
