import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/core/request', () => ({ http }))

describe('agreementTemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    http.get.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
  })

  it('lists templates with type/status filters and pagination', async () => {
    const { agreementTemplateService } = await import('@/services/agreementTemplate')

    await agreementTemplateService.list({ type: 'user_terms', status: 'active', page: 2, page_size: 10 })

    expect(http.get).toHaveBeenCalledWith('/admin/agreement-templates', {
      params: { type: 'user_terms', status: 'active', page: 2, page_size: 10 },
    })
  })

  it('returns template items without legacy cover fields', async () => {
    const { agreementTemplateService } = await import('@/services/agreementTemplate')

    const item = {
      id: 7,
      type: 'privacy' as const,
      title: '隐私政策',
      content: '<p>正文</p>',
      version: 2,
      status: 'active' as const,
      created_at: '2026-09-11T08:00:00+08:00',
      updated_at: '2026-09-11T08:00:00+08:00',
    }
    http.get.mockResolvedValueOnce({ items: [item], total: 1, page: 1, page_size: 20 })

    const page = await agreementTemplateService.list({ status: 'active', page: 1, page_size: 20 })

    expect(page.items[0].title).toBe('隐私政策')
    expect('cover_url' in page.items[0]).toBe(false)
  })

  it('creates a template via POST', async () => {
    const { agreementTemplateService } = await import('@/services/agreementTemplate')

    await agreementTemplateService.create({
      type: 'identity_auth',
      title: '实名信息处理授权协议',
      content: '正文',
    })

    expect(http.post).toHaveBeenCalledWith('/admin/agreement-templates', {
      type: 'identity_auth',
      title: '实名信息处理授权协议',
      content: '正文',
    })
  })

  it('updates a template by id (new version)', async () => {
    const { agreementTemplateService } = await import('@/services/agreementTemplate')

    await agreementTemplateService.update(7, { title: 'v2 标题', content: 'v2 正文' })

    expect(http.put).toHaveBeenCalledWith('/admin/agreement-templates/7', {
      title: 'v2 标题',
      content: 'v2 正文',
    })
  })

  it('archives a template via the dedicated endpoint', async () => {
    const { agreementTemplateService } = await import('@/services/agreementTemplate')

    await agreementTemplateService.archive(7)

    expect(http.put).toHaveBeenCalledWith('/admin/agreement-templates/7/archive')
  })
})
