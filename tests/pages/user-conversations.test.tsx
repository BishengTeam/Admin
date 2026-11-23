import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import UserDetailDrawer from '@/pages/users/components/UserDetailDrawer'
import { useAuthStore } from '@/stores/authStore'
import type { UserDetail } from '@/types/user'

vi.mock('@/components/ReviewHistory', () => ({ default: () => <div>审核记录占位</div> }))

beforeAll(() => {
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => computed(element, pseudo))
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false, addListener() {}, removeListener() {}, addEventListener() {},
      removeEventListener() {}, dispatchEvent() {}, media: '',
    })),
  })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

beforeEach(() => {
  useAuthStore.setState({ permissions: ['*'], initialized: true })
})

afterEach(cleanup)

const user: UserDetail = {
  id: 7,
  openid: 'openid-7',
  phone: '13800138000',
  is_active: true,
  created_at: '2026-11-20T10:00:00+08:00',
  orders: [],
  conversations: [{
    id: 3,
    session_id: 'session-3',
    backend_type: 'dify',
    message_count: 2,
    created_at: '2026-11-23T09:00:00+08:00',
    messages: [
      { role: 'user', content: '怎么报名 H3C 认证？' },
      { role: 'assistant', content: '登录后在认证专区选择新华三认证即可报名。' },
    ],
  }],
}

it('用户详情展示会话首句与轮数，展开后可见完整问答', async () => {
  render(<UserDetailDrawer user={user} open onClose={() => {}} />)

  // 首句列：优先展示用户第一句，而不是空白
  expect(await screen.findByText('怎么报名 H3C 认证？')).toBeInTheDocument()
  expect(screen.getByText('共 1 个会话，点击行首箭头展开查看完整问答。')).toBeInTheDocument()

  // 展开前看不到 AI 回复
  expect(screen.queryByText('登录后在认证专区选择新华三认证即可报名。')).toBeNull()

  // Drawer 渲染在 portal 中，需从 document 查询
  const expandIcon = await waitFor(() => {
    const icon = document.querySelector('.ant-table-row-expand-icon')
    expect(icon).not.toBeNull()
    return icon as HTMLElement
  })
  fireEvent.click(expandIcon)

  await waitFor(() => {
    expect(screen.getByText('登录后在认证专区选择新华三认证即可报名。')).toBeInTheDocument()
  })
})
