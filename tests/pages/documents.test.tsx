import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminRoutes } from '@/routes'

describe('admin-managed operational documents', () => {
  it('adds the document page behind the narrow document permission', () => {
    const operations = adminRoutes.find((route) => route.path === 'operations')!
    const documents = operations.children!.find((route) => route.path === 'documents')!

    expect(documents.meta?.permission).toBe('document:read')
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
})
