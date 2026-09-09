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
