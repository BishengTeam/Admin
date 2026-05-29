import type MockAdapter from 'axios-mock-adapter'
import type { Order, OrderDetail } from '@/types/order'

const certTypes = ['H3CNE-RS+', 'H3CSE-RS+', 'H3CIE-RS+', '深信服安全', 'NISP一级', '人社认证']
const users = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '冯二']
const statuses: Order['status'][] = ['pending', 'paid', 'completed', 'refunded', 'abnormal']
const statusWeights = [3, 4, 5, 2, 1] as const

function randomStatus(): Order['status'] {
  const total = statusWeights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < statuses.length; i++) {
    r -= statusWeights[i]
    if (r <= 0) return statuses[i]
  }
  return 'paid'
}

const mockOrders: Order[] = Array.from({ length: 108 }, (_, i) => ({
  id: i + 1,
  order_no: `ORD${String(i + 1).padStart(5, '0')}`,
  user_name: users[i % users.length],
  user_avatar: '',
  user_phone: `1${[3,5,8,6,9][i % 5]}${String(Math.random() * 1e9).slice(0, 9)}`,
  cert_type: certTypes[i % certTypes.length],
  amount: [120000, 180000, 300000, 80000, 150000, 50000][i % 6],
  status: randomStatus(),
  created_at: new Date(2026, 4, 1 + i * 0.5).toISOString(),
}))

function getDetail(id: number): OrderDetail {
  const order = mockOrders.find((o) => o.id === id)!
  return {
    ...order,
    pay_time: order.status !== 'pending' ? new Date(Date.parse(order.created_at) + 3600000).toISOString() : undefined,
    refund_time: order.status === 'refunded' ? new Date(Date.parse(order.created_at) + 86400000).toISOString() : undefined,
    refund_reason: order.status === 'refunded' ? '用户申请退款' : undefined,
    refund_amount: order.status === 'refunded' ? order.amount : undefined,
  }
}

export function registerOrdersMock(mock: MockAdapter) {
  mock.onGet('/admin/orders').reply((config) => {
    const params = config.params || {}
    let filtered = [...mockOrders]

    if (params.status) {
      filtered = filtered.filter((o) => o.status === params.status)
    }
    if (params.cert_type) {
      filtered = filtered.filter((o) => o.cert_type === params.cert_type)
    }
    if (params.user_phone) {
      filtered = filtered.filter((o) => o.user_phone.includes(params.user_phone))
    }

    const page = Number(params.page) || 1
    const pageSize = Number(params.page_size) || 20
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return [200, {
      code: 200,
      message: 'ok',
      data: { items, total: filtered.length, page, page_size: pageSize },
    }]
  })

  mock.onGet(/\/admin\/orders\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/orders\/(\d+)$/)![1])
    return [200, { code: 200, message: 'ok', data: getDetail(id) }]
  })

  mock.onPost(/\/admin\/orders\/\d+\/refund/).reply(() => {
    return [200, { code: 200, message: '退款成功', data: null }]
  })

  mock.onGet('/admin/orders/export').reply(() => {
    return [200, new Blob(['mock export data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })]
  })

  mock.onGet('/admin/orders/reconciliation').reply((config) => {
    const date = config.params?.date || '2026-05-01'
    return [200, {
      code: 200,
      message: 'ok',
      data: {
        date,
        order_total: 4560000,
        refund_total: 320000,
        net_income: 4240000,
        order_count: 38,
      },
    }]
  })
}
