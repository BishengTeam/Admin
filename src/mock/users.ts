import type MockAdapter from 'axios-mock-adapter'
import type { User, UserDetail } from '@/types/user'

const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗']
const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '秀英', '华', '慧']

const activeFlags = [true, true, true, true, true, true, true, false]

const mockUsers: User[] = Array.from({ length: 53 }, (_, i) => ({
  id: i + 1,
  openid: `${firstNames[i % firstNames.length]}${lastNames[i % lastNames.length]}`,
  phone: `1${[3,5,8,6,9,7][i % 6]}${String(Math.random() * 1e9).slice(0, 9)}`,
  is_active: activeFlags[i % activeFlags.length],
  created_at: new Date(2025, 0, 1 + i * 3).toISOString(),
}))

const mockDetails: Record<number, UserDetail> = {}

function getDetail(id: number): UserDetail {
  if (mockDetails[id]) return mockDetails[id]
  const user = mockUsers.find((u) => u.id === id)!
  const detail: UserDetail = {
    ...user,
    email: `${user.phone}@example.com`,
    school: ['北京邮电大学', '华中科技大学', '电子科技大学', '西安电子科技大学', '南京邮电大学'][id % 5],
    orders: Array.from({ length: 3 + (id % 5) }, (_, j) => ({
      id: id * 100 + j,
      out_trade_no: `ORD${String(id).padStart(4, '0')}${String(j).padStart(3, '0')}`,
      price: [120000, 180000, 300000, 80000, 150000][j % 5],
      status: ['paid', 'completed', 'pending', 'refunded', 'paid'][j % 5],
      created_at: new Date(2026, 2, 1 + j * 7).toISOString(),
    })),
    conversations: Array.from({ length: 2 + (id % 4) }, (_, k) => ({
      id: id * 200 + k,
      message: [
        '请问H3CNE考试需要多长时间准备？',
        '报名流程是怎样的？',
        '培训课程什么时候开班？',
        '考试费用是多少？',
        '有没有学习资料推荐？',
      ][k % 5],
      intent: ['考试咨询', '报名咨询', '课程咨询', '费用咨询', '资料咨询'][k % 5],
      created_at: new Date(2026, 3, 10 + k * 2).toISOString(),
    })),
  }
  mockDetails[id] = detail
  return detail
}

export function registerUsersMock(mock: MockAdapter) {
  mock.onGet('/admin/users').reply((config) => {
    const params = config.params || {}
    let filtered = [...mockUsers]

    if (params.openid) {
      filtered = filtered.filter((u) => u.openid.includes(params.openid))
    }
    if (params.phone) {
      filtered = filtered.filter((u) => u.phone.includes(params.phone))
    }
    if (params.is_active !== undefined) {
      filtered = filtered.filter((u) => u.is_active === params.is_active)
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

  mock.onGet(/\/admin\/users\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/users\/(\d+)$/)![1])
    const detail = getDetail(id)
    return [200, { code: 200, message: 'ok', data: detail }]
  })

  mock.onGet(/\/admin\/users\/\d+\/orders/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/users\/(\d+)/)![1])
    const detail = getDetail(id)
    return [200, { code: 200, message: 'ok', data: detail.orders }]
  })

  mock.onGet(/\/admin\/users\/\d+\/conversations/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/users\/(\d+)/)![1])
    const detail = getDetail(id)
    return [200, { code: 200, message: 'ok', data: detail.conversations }]
  })

  mock.onPatch(/\/admin\/users\/\d+\/status/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/users\/(\d+)/)![1])
    const { is_active } = JSON.parse(config.data)
    const user = mockUsers.find((u) => u.id === id)
    if (user) user.is_active = is_active
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onPost('/admin/users/batch-delete').reply((config) => {
    const { ids } = JSON.parse(config.data) as { ids: number[] }
    for (const id of ids) {
      const idx = mockUsers.findIndex((u) => u.id === id)
      if (idx >= 0) mockUsers.splice(idx, 1)
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onGet('/admin/users/export').reply((config) => {
    const params = config.params || {}
    let filtered = [...mockUsers]
    if (params.openid) filtered = filtered.filter((u) => u.openid.includes(params.openid))
    if (params.phone) filtered = filtered.filter((u) => u.phone.includes(params.phone))
    const csv = ['用户名,手机号,状态,注册时间']
      .concat(filtered.map((u) => [u.openid, u.phone, u.is_active ? '正常' : '已禁用', u.created_at].join(',')))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    return [200, blob]
  })
}
