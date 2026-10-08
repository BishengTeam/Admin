import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminRoutes } from '@/routes'
import { buildMenuItems } from '@/layouts/AdminLayout'

describe('admin-managed operational documents', () => {
  it('groups agreements and operational documents under content management', () => {
    const content = adminRoutes.find((route) => route.path === 'content')!
    const agreements = content.children!.find(
      (route) => route.path === 'agreement-templates',
    )!
    const documents = content.children!.find((route) => route.path === 'documents')!

    expect(agreements.meta?.permission).toBe('content:list')
    expect(documents.meta?.permission).toBe('document:read')
  })

  it('keeps legacy document URLs as hidden redirects', () => {
    const operations = adminRoutes.find((route) => route.path === 'operations')!
    const legacyDocument = operations.children!.find(
      (route) => route.path === 'documents',
    )!
    const legacyAgreement = adminRoutes.find(
      (route) => route.path === 'agreement-templates',
    )!

    expect(legacyDocument.meta?.hidden).toBe(true)
    expect(legacyAgreement.meta?.hidden).toBe(true)
  })

  it('filters content-management children by their own permissions', () => {
    const superMenu = buildMenuItems(adminRoutes, ['*'], true, 'super_admin') as Array<{
      key: string
      children?: Array<{ key: string }>
    }>
    const documentOnlyMenu = buildMenuItems(
      adminRoutes,
      ['document:read'],
      true,
      'cert_admin',
    ) as Array<{ key: string; children?: Array<{ key: string }> }>
    const agreementOnlyMenu = buildMenuItems(
      adminRoutes,
      ['content:list'],
      true,
      'cert_admin',
    ) as Array<{ key: string; children?: Array<{ key: string }> }>

    expect(superMenu.find((item) => item.key === 'content')?.children?.map((item) => item.key)).toEqual([
      'content/agreement-templates',
      'content/documents',
    ])
    expect(documentOnlyMenu.find((item) => item.key === 'content')?.children?.map((item) => item.key)).toEqual([
      'content/documents',
    ])
    expect(agreementOnlyMenu.find((item) => item.key === 'content')?.children?.map((item) => item.key)).toEqual([
      'content/agreement-templates',
    ])
  })

  it('uses a PDF-only OSS upload flow rather than image cropping', () => {
    const page = readFileSync(
      resolve(process.cwd(), 'src/pages/operations/documents/index.tsx'),
      'utf8',
    )
    const service = readFileSync(resolve(process.cwd(), 'src/services/document.ts'), 'utf8')

    expect(page).toContain("accept: '.pdf,application/pdf'")
    expect(page).toContain("file.name.toLowerCase().endsWith('.pdf')")
    expect(page).toContain("file.type === 'application/pdf'")
    expect(page).toContain('MAX_PDF_BYTES = 20 * 1024 * 1024')
    expect(page).not.toContain('ImageUpload')
    expect(page).not.toContain('CoverCropper')
    expect(service).toContain("'/admin/documents'")
    expect(service).toContain('`/admin/documents/${id}/file`')
  })

  it('shows fixed mini-program scenes in agreement-template-style cards', () => {
    const page = readFileSync(
      resolve(process.cwd(), 'src/pages/operations/documents/index.tsx'),
      'utf8',
    )
    const stylesheet = readFileSync(
      resolve(process.cwd(), 'src/pages/operations/documents/index.module.css'),
      'utf8',
    )

    expect(page).toContain("value: 'h3c_student_xuexin_guide'")
    expect(page).toContain('H3C报名表单 / 学生材料')
    expect(page).toContain("value: 'nisp_education_report_guide'")
    expect(page).toContain('NISP报名表单 / 二级学籍报告')
    expect(page).toContain("value: 'nisp_level2_application_form'")
    expect(page).toContain('NISP报名表单 / 二级申请表')
    expect(page).toContain('小程序固定入口')
    expect(page).toContain('小程序入口文案')
    expect(page).toContain('小程序入口会保留并提示联系管理员')
    expect(stylesheet).toContain('.shelf')
    expect(stylesheet).toContain('.coverRegion')
    expect(stylesheet).toContain('aspect-ratio: 3 / 4')
    expect(page).not.toContain('<Table')
  })
})
