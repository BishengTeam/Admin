import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('certification attachment management', () => {
  it('supports vendor, batch and schedule scopes with vendor-scoped uploads', () => {
    const source = read('src/pages/certification/components/shared/CertAttachmentManager.tsx')

    expect(source).toContain("value: 'vendor'")
    expect(source).toContain("value: 'plan'")
    expect(source).toContain("value: 'schedule'")
    expect(source).toContain('plan_id: values.scope === \'plan\' ? values.plan_id : null')
    expect(source).toContain('schedule_id: values.scope === \'schedule\' ? values.schedule_id : null')
    expect(source).toContain('/admin/cert-attachments/upload?vendor=')
    expect(source).toContain("request.get(`/admin/cert-attachments?vendor=")
    expect(source).toContain('h3cService.listBatches')
    expect(source).toContain('nispService.listBatches')
    expect(source).toContain('rensheService.listBatches')
    expect(source).toContain('sangforService.batches()')
    expect(source).toContain("['h3c', 'sangfor'].includes(vendor)")
    expect(source).toContain("const scheduleRows = ['h3c', 'sangfor'].includes(vendor)")
  })

  it('is registered for every vendor workbench', () => {
    const registry = read('src/pages/certification/components/vendors/vendor-registry.ts')

    expect(registry.match(/label: '附件管理'/g)?.length).toBe(4)
    expect(registry.match(/CertAttachmentManager/g)?.length).toBe(4)
  })

  it('batch forms expose registration notice as a separate field', () => {
    const sangfor = read('src/pages/certification/components/vendors/sangfor/BatchOverrides.tsx')
    const h3c = read('src/pages/certification/components/vendors/h3c/BatchOverrides.tsx')

    for (const source of [sangfor, h3c]) {
      expect(source).toContain("name='registration_notice'")
      expect(source).toContain('报名注意事项')
      expect(source).toContain('registration_notice')
    }
  })
})
