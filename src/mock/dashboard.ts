import type MockAdapter from 'axios-mock-adapter'
import type { DashboardData } from '@/types/dashboard'

const schools = [
  '北京邮电大学', '华中科技大学', '电子科技大学', '西安电子科技大学',
  '南京邮电大学', '浙江大学', '上海交通大学', '哈尔滨工业大学',
  '武汉大学', '中山大学', '四川大学', '华南理工大学',
]

function generateMockData(): DashboardData {
  const dates: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 4, 20 - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  return {
    stats: {
      total_users: 1280,
      total_conversations: 8562,
      transfer_rate: 12.5,
      total_orders: 423,
      payment_success_rate: 87.3,
      total_revenue: 89250,
    },

    conversion_trend: dates.map((date, i) => ({
      date,
      browse: 200 + Math.floor(Math.random() * 50) + i * 3,
      cart: 120 + Math.floor(Math.random() * 30) + i * 2,
      order: 60 + Math.floor(Math.random() * 20) + i,
      payment: 50 + Math.floor(Math.random() * 15) + i,
    })),

    quality_distribution: [
      { name: '满意', value: 5230 },
      { name: '一般', value: 2410 },
      { name: '不满意', value: 922 },
    ],

    revenue_trend: dates.map((date, i) => ({
      date,
      amount: 2000 + Math.floor(Math.random() * 3000) + i * 50,
    })),

    school_registrations: schools
      .map((school, i) => ({
        school,
        count: 80 - i * 5 + Math.floor(Math.random() * 10),
        rank: i + 1,
      }))
      .sort((a, b) => b.count - a.count)
      .map((s, i) => ({ ...s, rank: i + 1 })),
  }
}

export function registerDashboardMock(mock: MockAdapter) {
  mock.onGet('/admin/statistics/dashboard').reply(() => {
    const data = generateMockData()
    return [200, { code: 200, message: 'ok', data }]
  })
}
