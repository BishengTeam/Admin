import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Dashboard from '@/pages/dashboard'
import { useAuthStore } from '@/stores/authStore'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false, addListener() {}, removeListener() {}, addEventListener() {},
      removeEventListener() {}, dispatchEvent() {}, media: '',
    })),
  })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

const dashboardData = vi.hoisted(() => ({
  total_users: 12,
  total_orders: 34,
  recent_orders_30d: 5,
  paid_orders: 20,
  refunded_orders: 1,
  revenue_fen: 100000,
  recent_revenue_30d_fen: 50000,
  conversion_rate: 58.8,
  ai_conversations_total: 7,
  ai_conversations_30d: 3,
  tickets_waiting_manual: 2,
  quiz_attempts_today: 9,
  quiz_attempts_30d: 40,
  quiz_libraries_total: 6,
  quiz_questions_inventory_total: 150,
  quiz_questions_practicable_total: 120,
  quiz_questions_total: 100,
  h3c_pending_review: 1,
  h3c_approved: 2,
  nisp_pending_review: 3,
  nisp_approved: 4,
  courses_total: 8,
  competitions_active: 2,
  competition_registrations: 11,
  revenue_trend: [],
  user_trend: [],
  quiz_trend: [],
  order_type_distribution: [],
  cert_status: { h3c: { pending_review: 1, approved: 2, final_approved: 1 }, nisp: { pending_review: 3, approved: 4 } },
}))

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({ data: dashboardData, loading: false, error: null, refresh: vi.fn() }),
}))

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid='chart' /> }))

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route path='/admin/dashboard' element={<Dashboard />} />
        <Route path='/admin/users' element={<div>用户管理页</div>} />
        <Route path='/admin/orders' element={<div>订单管理页</div>} />
        <Route path='/admin/certification/h3c' element={<div>H3C 工作台</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function clickCard(title: string) {
  const card = screen.getByText(title).closest('.ant-card')
  expect(card).not.toBeNull()
  fireEvent.click(card!)
}

beforeEach(() => {
  useAuthStore.setState({ permissions: ['*'], initialized: true })
})

afterEach(cleanup)

describe('数据看板卡片下钻', () => {
  it('点击注册用户卡片跳转用户管理', async () => {
    renderDashboard()
    clickCard('注册用户')
    await waitFor(() => expect(screen.getByText('用户管理页')).toBeInTheDocument())
  })

  it('点击订单/认证卡片跳转对应管理页', async () => {
    renderDashboard()
    clickCard('订单总数')
    await waitFor(() => expect(screen.getByText('订单管理页')).toBeInTheDocument())
  })

  it('无对应权限时不跳转（卡片保持纯展示）', async () => {
    useAuthStore.setState({ permissions: ['user:list'], initialized: true })
    renderDashboard()
    clickCard('订单总数')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('订单管理页')).toBeNull()
    expect(screen.getByText('数据概览')).toBeInTheDocument()
  })
})
