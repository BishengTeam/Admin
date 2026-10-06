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
    expect(vendors).toContain('requiresProductFilter: true')
    expect(routes).toContain("path: 'sangfor'")
    expect(routes).toContain("<TypeWorkbench type='sangfor' />")
  })
})
