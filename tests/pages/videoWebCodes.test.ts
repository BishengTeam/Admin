import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('VideoWeb code management', () => {
  it('registers the course code page behind course permissions', async () => {
    const routes = await readFile('src/routes.tsx', 'utf8')
    expect(routes).toContain("import('@/pages/courses/Codes')")
    expect(routes).toContain("path: 'codes'")
    expect(routes).toContain("permission: 'course:read'")
  })

  it('proxies list, create, revoke, and refund operations through the backend', async () => {
    const source = await readFile('src/services/videoWebService.ts', 'utf8')
    expect(source).toContain("'/admin/videoweb/codes'")
    expect(source).toContain('/admin/videoweb/codes/${id}/revoke')
    expect(source).toContain('/admin/videoweb/codes/${id}/refund')
  })

  it('keeps copy, revoke, and refund actions in the page', async () => {
    const source = await readFile('src/pages/courses/Codes.tsx', 'utf8')
    expect(source).toContain('生成兑换码')
    expect(source).toContain('copyCode(record.code)')
    expect(source).toContain('撤销兑换码')
    expect(source).toContain('退款回收')
  })
})
