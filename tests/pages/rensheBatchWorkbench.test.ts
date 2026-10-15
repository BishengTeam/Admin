import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Renshe batch workbench contract', () => {
  it('registers the batch-first workflow and hides legacy daily review/export tabs', async () => {
    const [registry, routes] = await Promise.all([
      readFile('src/pages/certification/components/vendors/vendor-registry.ts', 'utf8'),
      readFile('src/routes.tsx', 'utf8'),
    ])
    const rensheProfile = registry.slice(
      registry.indexOf("type: 'renshe'"),
      registry.indexOf("type: 'sangfor'"),
    )

    expect(rensheProfile).toContain('batchFirst: true')
    expect(rensheProfile).toContain("label: '退款管理'")
    expect(rensheProfile).not.toContain("label: '报名审核'")
    expect(rensheProfile).not.toContain("label: '导出'")
    expect(routes).toContain("path: 'renshe/batches/:batchId'")
  })

  it('uses one selection for selected exports and batch external review', async () => {
    const source = await readFile(
      'src/pages/certification/components/vendors/renshe/BatchWorkbench.tsx',
      'utf8',
    )

    expect(source).toContain('mergeSelectedApplications')
    expect(source).toContain("exportApplications('selected')")
    expect(source).toContain("exportApplications('filter')")
    expect(source).toContain('batchExternalReview')
    expect(source).toContain('returnForCorrection')
    expect(source).toContain('current_version_exported')
    expect(source).toContain('当前版本未成功导出')
  })
})
