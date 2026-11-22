import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('renshe exam metadata and holiday management', () => {
  it('renshe batch form edits exam organization and date note', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')

    expect(source).toContain("name=\"exam_org_name\"")
    expect(source).toContain("name=\"exam_org_code\"")
    expect(source).toContain("name=\"exam_date_note\"")
    expect(source).toContain('exam_org_name: values.exam_org_name?.trim() || null')
    expect(source).toContain('confirm_holiday: confirmHoliday')
    expect(source).toContain('确认为假期考试')
  })

  it('holiday manager is registered for all vendors', () => {
    const registry = read('src/pages/certification/components/vendors/vendor-registry.ts')
    const manager = read('src/pages/certification/components/shared/HolidayManager.tsx')

    expect(registry.match(/label: '假期管理'/g)?.length).toBe(4)
    expect(manager).toContain("request.get('/admin/holidays')")
    expect(manager).toContain("request.post('/admin/holidays'")
    expect(manager).toContain("request.delete(`/admin/holidays/${row.id}`)")
  })
})
