import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BannerTab from '@/pages/operations/homepage/BannerTab'
import PopupTab from '@/pages/operations/homepage/PopupTab'

const mocks = vi.hoisted(() => ({ data: { items: [] as object[] }, create: vi.fn(), update: vi.fn(), list: vi.fn() }))
vi.mock('@/hooks/usePagination', () => ({ usePagination: () => ({ data: mocks.data, refresh: vi.fn(), loading: false, pagination: false }) }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => <input aria-label="测试封面" value={value || ''} onChange={event => onChange(event.target.value)} /> }))
vi.mock('@/services/banner', () => ({ bannerService: { create: mocks.create, update: mocks.update } }))
vi.mock('@/services/popup', () => ({ popupService: { create: mocks.create, update: mocks.update } }))
vi.mock('@/services/activity', () => ({ activityService: { list: mocks.list } }))
vi.mock('@/services/job', () => ({ jobService: { list: mocks.list } }))
beforeEach(() => {
  mocks.data = { items: [] }; mocks.create.mockReset().mockResolvedValue({}); mocks.update.mockReset().mockResolvedValue({}); mocks.list.mockReset().mockResolvedValue({ items: [] })
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(cleanup)

for (const [name, Component] of [['Banner', BannerTab], ['弹窗海报', PopupTab]] as const) {
  it(`${name} selects grouped searchable NISP targets and stores the level parameter`, async () => {
    render(<Component />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`新增\\s*${name}`) }))
    fireEvent.change(screen.getByLabelText('测试封面'), { target: { value: 'https://example.com/cover.jpg' } })
    fireEvent.click(screen.getByLabelText('页面'))
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '选择页面' }))
    expect(await screen.findByText('认证报名', { selector: '.ant-select-item-group' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: '选择页面' }), { target: { value: 'NISP二级' } })
    fireEvent.click(await screen.findByText('NISP二级报名批次', { selector: '.ant-select-item-option-content' }))
    fireEvent.click(screen.getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ jump_link: '/pages/nisp/index?level=2' })))
    expect(screen.queryByLabelText('课程')).toBeNull()
  })

  it(`${name} blocks retired course details until an explicit replacement is selected`, async () => {
    mocks.data.items = [{ id: 3, image_url: 'https://example.com/cover.jpg', jump_link: '/pages/course/detail?id=7', sort: 0, is_active: true, start_time: null, end_time: null }]
    render(<Component />)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    expect((await screen.findAllByText('目标页面已下线，请重新选择')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(document.querySelector('.ant-form-item-explain-error')).toHaveTextContent('目标页面已下线'))
    expect(mocks.update).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('不跳转'))
    fireEvent.click(screen.getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(3, expect.objectContaining({ jump_link: null })))
  })

  it(`${name} rejects HTTP inline and saves allowed HTTPS external links`, async () => {
    render(<Component />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`新增\\s*${name}`) }))
    fireEvent.change(screen.getByLabelText('测试封面'), { target: { value: 'https://example.com/cover.jpg' } })
    fireEvent.click(screen.getByLabelText('外部链接'))
    fireEvent.change(screen.getByRole('textbox', { name: '外部链接' }), { target: { value: 'http://ztyyx.cn' } })
    fireEvent.click(screen.getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await screen.findByText('请输入有效的HTTPS链接')
    expect(mocks.create).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: '外部链接' }), { target: { value: 'https://ztyyx.cn/a?q=%26' } })
    fireEvent.click(screen.getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ jump_link: 'https://ztyyx.cn/a?q=%26' })))
  })
}
