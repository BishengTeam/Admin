import type MockAdapter from 'axios-mock-adapter'
import type { ContentItem, Banner, Course } from '@/types/content'

const zones = ['华三认证', '深信服认证', '竞赛专区', '人社认证']

const mockContent: ContentItem[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `内容${i + 1} - ${['H3CNE考试指南', '深信服安全培训', '竞赛报名须知', '人社认证流程'][i % 4]}`,
  zone: zones[i % zones.length],
  cover_url: '',
  description: `这是内容${i + 1}的详细描述`,
  external_url: i % 3 === 0 ? `https://example.com/page/${i + 1}` : '',
  sort_weight: 25 - i,
  status: (i < 20 ? 'online' : 'offline') as 'online' | 'offline',
  created_at: new Date(2026, 3, 1 + i).toISOString(),
}))

const mockBanners: Banner[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  image_url: '',
  jump_link: i % 2 === 0 ? `https://example.com/activity/${i + 1}` : '',
  sort: 8 - i,
  start_time: new Date(2026, 4, 1).toISOString(),
  end_time: new Date(2026, 5, 30).toISOString(),
  status: (i < 6 ? 'online' : 'offline') as 'online' | 'offline',
}))

const mockCourses: Course[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: ['H3CNE-RS+ 认证培训', 'H3CSE-RS+ 认证培训', 'H3CIE-RS+ 高级培训', '深信服安全工程师培训', 'NISP一级培训'][i % 5],
  category: i < 9 ? 'h3c' : 'sangfor',
  price: [120000, 180000, 300000, 150000, 80000][i % 5],
  class_count: [3, 2, 1, 2, 4][i % 5],
  status: (i < 13 ? 'online' : 'offline') as 'online' | 'offline',
  teacher_name: `讲师${i + 1}`,
  teacher_contact: `1${[3, 5, 8][i % 3]}${String(Math.random() * 1e9).slice(0, 9)}`,
  created_at: new Date(2026, 2, 1 + i * 5).toISOString(),
  schedules: Array.from({ length: [3, 2, 1, 2, 4][i % 5] }, (_, j) => ({
    id: i * 10 + j + 1,
    course_id: i + 1,
    class_date: new Date(2026, 5, 10 + j * 7).toISOString().slice(0, 10),
    start_time: '09:00',
    end_time: '17:00',
    price: Math.round([120000, 180000, 300000, 150000, 80000][i % 5] / [3, 2, 1, 2, 4][i % 5]),
    location: ['北京校区A栋201', '线上直播', '上海校区B栋301', '广州校区C栋102', '线上直播'][j % 5],
  })),
}))

let nextContentId = 26
let nextBannerId = 9
let nextCourseId = 16

export function registerContentMock(mock: MockAdapter) {
  // === Content / Zones ===
  mock.onGet('/admin/content/zones').reply((config) => {
    const params = config.params || {}
    let filtered = [...mockContent]
    if (params.keyword) {
      filtered = filtered.filter((c) => c.title.includes(params.keyword))
    }

    const page = Number(params.page) || 1
    const pageSize = Number(params.page_size) || 20
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return [200, { code: 200, message: 'ok', data: { items, total: filtered.length, page, page_size: pageSize } }]
  })

  mock.onPost('/admin/content/zones').reply((config) => {
    const data = JSON.parse(config.data)
    const item: ContentItem = { id: nextContentId++, ...data, created_at: new Date().toISOString() }
    mockContent.unshift(item)
    return [200, { code: 200, message: 'ok', data: item }]
  })

  mock.onPut(/\/admin\/content\/zones\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/zones\/(\d+)$/)![1])
    const data = JSON.parse(config.data)
    const idx = mockContent.findIndex((c) => c.id === id)
    if (idx >= 0) mockContent[idx] = { ...mockContent[idx], ...data }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onDelete(/\/admin\/content\/zones\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/zones\/(\d+)$/)![1])
    const idx = mockContent.findIndex((c) => c.id === id)
    if (idx >= 0) mockContent.splice(idx, 1)
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onPost('/admin/content/zones/batch-delete').reply((config) => {
    const { ids } = JSON.parse(config.data) as { ids: number[] }
    for (const id of ids) {
      const idx = mockContent.findIndex((c) => c.id === id)
      if (idx >= 0) mockContent.splice(idx, 1)
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onPatch(/\/admin\/content\/zones\/\d+\/status/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/zones\/(\d+)/)![1])
    const data = JSON.parse(config.data)
    const idx = mockContent.findIndex((c) => c.id === id)
    if (idx >= 0) mockContent[idx] = { ...mockContent[idx], status: data.status }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onPut('/admin/content/zones/sort').reply(() => {
    return [200, { code: 200, message: 'ok', data: null }]
  })

  // === Banners ===
  mock.onGet('/admin/content/banners').reply(() => {
    return [200, { code: 200, message: 'ok', data: mockBanners }]
  })

  mock.onPost('/admin/content/banners').reply((config) => {
    const data = JSON.parse(config.data)
    const item: Banner = { id: nextBannerId++, ...data }
    mockBanners.unshift(item)
    return [200, { code: 200, message: 'ok', data: item }]
  })

  mock.onPut(/\/admin\/content\/banners\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/banners\/(\d+)$/)![1])
    const data = JSON.parse(config.data)
    const idx = mockBanners.findIndex((b) => b.id === id)
    if (idx >= 0) mockBanners[idx] = { ...mockBanners[idx], ...data }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onDelete(/\/admin\/content\/banners\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/banners\/(\d+)$/)![1])
    const idx = mockBanners.findIndex((b) => b.id === id)
    if (idx >= 0) mockBanners.splice(idx, 1)
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onPost('/admin/content/banners/batch-delete').reply((config) => {
    const { ids } = JSON.parse(config.data) as { ids: number[] }
    for (const id of ids) {
      const idx = mockBanners.findIndex((b) => b.id === id)
      if (idx >= 0) mockBanners.splice(idx, 1)
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  // === Courses ===
  mock.onGet('/admin/content/courses').reply((config) => {
    const params = config.params || {}
    let filtered = [...mockCourses]
    if (params.keyword) {
      filtered = filtered.filter((c) => c.name.includes(params.keyword))
    }
    if (params.category) {
      filtered = filtered.filter((c) => c.category === params.category)
    }

    const page = Number(params.page) || 1
    const pageSize = Number(params.page_size) || 20
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return [200, { code: 200, message: 'ok', data: { items, total: filtered.length, page, page_size: pageSize } }]
  })

  mock.onPost('/admin/content/courses').reply((config) => {
    const data = JSON.parse(config.data)
    const item: Course = { id: nextCourseId++, ...data, created_at: new Date().toISOString() }
    mockCourses.unshift(item)
    return [200, { code: 200, message: 'ok', data: item }]
  })

  mock.onPut(/\/admin\/content\/courses\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/courses\/(\d+)$/)![1])
    const data = JSON.parse(config.data)
    const idx = mockCourses.findIndex((c) => c.id === id)
    if (idx >= 0) mockCourses[idx] = { ...mockCourses[idx], ...data }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onDelete(/\/admin\/content\/courses\/\d+$/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/content\/courses\/(\d+)$/)![1])
    const idx = mockCourses.findIndex((c) => c.id === id)
    if (idx >= 0) mockCourses.splice(idx, 1)
    return [200, { code: 200, message: 'ok', data: null }]
  })
}
