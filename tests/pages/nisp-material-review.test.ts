import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('certification review materials', () => {
  it('lets NISP reviewers preview every current material', () => {
    const page = readFileSync(
      resolve(
        process.cwd(),
        'src/pages/certification/components/vendors/nisp/ReviewTab.tsx',
      ),
      'utf8',
    )

    expect(page).toContain("nispService.getRegistration(reg.id)")
    expect(page).toContain("MaterialPreview")
    expect(page).toContain("'身份证双面'")
    expect(page).toContain("'寸照'")
    expect(page).toContain("'学籍报告'")
    expect(page).toContain("'NISP二级考试报名申请表'")
  })

  it('keeps H3C material preview on the existing detail endpoint', () => {
    const page = readFileSync(
      resolve(
        process.cwd(),
        'src/pages/certification/components/vendors/h3c/ReviewTab.tsx',
      ),
      'utf8',
    )
    const service = readFileSync(resolve(process.cwd(), 'src/services/h3c.ts'), 'utf8')

    expect(page).toContain("h3cService.getRegistration(registration.id)")
    expect(page).toContain('MaterialPreview')
    expect(service).toContain('`/admin/cert-products/h3c/registrations/${id}`')
  })

  it('uses one two-column review drawer style for H3C and NISP', () => {
    const h3c = readFileSync(
      resolve(process.cwd(), 'src/pages/certification/components/vendors/h3c/ReviewTab.tsx'),
      'utf8',
    )
    const nisp = readFileSync(
      resolve(process.cwd(), 'src/pages/certification/components/vendors/nisp/ReviewTab.tsx'),
      'utf8',
    )
    const shared = readFileSync(
      resolve(
        process.cwd(),
        'src/pages/certification/components/shared/ReviewDetailDrawer.tsx',
      ),
      'utf8',
    )

    expect(h3c).toContain("from '../../shared/ReviewDetailDrawer'")
    expect(nisp).toContain("from '../../shared/ReviewDetailDrawer'")
    expect(shared).toContain("<Drawer")
    expect(shared).toContain("width={720}")
    expect((shared.match(/column=\{2\}/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(shared).toContain("title='报名信息'")
    expect(shared).toContain("title='报名材料'")
  })

  it('labels NISP exports as full packages with per-candidate archives', () => {
    const page = readFileSync(
      resolve(
        process.cwd(),
        'src/pages/certification/components/vendors/nisp/ExportTab.tsx',
      ),
      'utf8',
    )

    expect(page).toContain("'full_package'")
    expect(page).toContain('完整资料包')
    expect(page).toContain('每位考生独立 ZIP')
  })
})
