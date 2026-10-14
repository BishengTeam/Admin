import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('certification product vendors', () => {
  it('keeps product management in sync with backend vendor types', () => {
    const registry = readFile('src/pages/certification/components/vendors/type-registry.ts')
    const vendors = readFile('src/pages/certification/components/vendors/vendor-registry.ts')
    const routes = readFile('src/routes.tsx')

    expect(registry).toContain("export const CERT_TYPES = ['h3c', 'nisp', 'sangfor', 'renshe'] as const")
    expect(registry).toContain("nisp: { label: 'NISP'")
    expect(registry).toContain("sangfor: { label: '深信服'")
    expect(vendors).toContain("type: 'sangfor'")
    expect(vendors).not.toContain('requiresProductFilter')
    expect(vendors).not.toContain('fixedProductCode')
    expect(readFile('src/pages/certification/TypeWorkbench.tsx'))
      .not.toContain('certProductService')
    expect(readFile('src/pages/certification/TypeWorkbench.tsx'))
      .not.toContain('Select')
    expect(readFile('src/pages/certification/components/shared/PlanTable.tsx'))
      .toContain("name='product_code'")
    expect(readFile('src/pages/certification/components/shared/PlanTable.tsx'))
      .not.toContain("placeholder='选择产品查看批次'")
    expect(readFile('src/pages/certification/components/shared/ProductTable.tsx'))
      .toContain("导入价格表")
    expect(readFile('src/services/certProduct.ts'))
      .toContain("'/admin/cert-products/catalog/import'")
    expect(routes).toContain("path: 'sangfor'")
    expect(routes).toContain("<TypeWorkbench type='sangfor' />")
  })
})
