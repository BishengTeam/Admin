import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CertificationPlan } from '@/types/certification'
import { hydrateProjectManager } from '@/pages/certification/components/vendors/renshe/multiBatchState'
import { rensheDisplayValue } from '@/utils/renshe'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('renshe multi-project batch editor', () => {
  it('hydrates an open project manager with the silently refreshed batch', () => {
    const plan = (id: number, name: string) => ({ id, name } as CertificationPlan)
    expect(hydrateProjectManager(null, [plan(1, '新名称')])).toBeNull()
    expect(hydrateProjectManager(plan(1, '旧名称'), [plan(1, '新名称')])?.name).toBe('新名称')
    const current = plan(2, '其他批次')
    expect(hydrateProjectManager(current, [plan(1, '新名称')])).toBe(current)
  })

  it('formats professional years with two decimals', () => {
    expect(rensheDisplayValue('reporting_info.occupation_years', 11.9)).toBe('11.90 年')
    expect(rensheDisplayValue('reporting_info.occupation_years', '11.906')).toBe('11.91 年')
  })

  it('edits registration notice for single and multi batches', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    expect(source).toContain("name=\"registration_notice\"")
    expect(source).toContain('registration_notice: values.registration_notice?.trim() || null')
    expect(source).toContain('registration_notice: plan.registration_notice || undefined')
  })

  it('published multi batches can edit the allowed batch fields without changing projects', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    expect(source).toContain('publishedMulti')
    expect(source).toContain('已发布批次的项目集合与价格已锁定')
    expect(source).toContain('updateMultiBatch(editingPlan.id, payload)')
  })

  it('project price can be edited from the project manager', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    expect(source).toContain('function ProjectPriceInput')
    expect(source).toContain('saveProjectPrice')
    expect(source).toContain('price_cents: priceCents')
    expect(source).toContain('if (!saved) setValue(project.price_cents / 100)')
  })

  it('project switches require confirmation and serialize while saving', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    expect(source).toContain('确认下架')
    expect(source).toContain('projectSaving')
    expect(source).toContain('projectRequest')
    expect(source).toContain('disabled={projectSaving}')
  })

  it('closed-registration batches keep the allowed edit entry until finalize', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    expect(source).toContain("['published', 'registration_closed'].includes(plan.status)")
  })

  it('closing the project manager cancels in-flight update display', () => {
    const source = read('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    expect(source).toContain('closeProjectManager')
    expect(source).toContain('projectRequest.current += 1')
    expect(source).toContain('projectWriteLock')
    expect(source).toContain('loadPlans(true)')
  })
})
