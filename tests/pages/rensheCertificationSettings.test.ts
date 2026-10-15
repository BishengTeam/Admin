import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Renshe certification settings and batch programs', () => {
  it('uses one display-only settings page instead of the product catalog', () => {
    const registry = readFile('src/pages/certification/components/vendors/vendor-registry.ts')
    const settings = readFile('src/pages/certification/components/vendors/renshe/CertificationSettings.tsx')
    const rensheProfile = registry.slice(
      registry.indexOf("type: 'renshe'"),
      registry.indexOf("type: 'sangfor'"),
    )

    expect(rensheProfile).toContain("productTabLabel: '认证设置'")
    expect(rensheProfile).toContain("import('./renshe/CertificationSettings')")
    expect(settings).toContain("name='chinese_name'")
    expect(settings).toContain("label='认证介绍'")
    expect(settings).toContain("label='首页封面'")
    expect(settings).toContain("label='启用状态'")
    expect(settings).not.toContain("label='产品编码'")
    expect(settings).not.toContain("label='英文名'")
    expect(settings).not.toContain('学生价')
    expect(settings).not.toContain('普通价')
    expect(settings).not.toContain('新增产品')
  })

  it('creates batches with server-controlled program data', () => {
    const source = readFile('src/pages/certification/components/vendors/renshe/BatchOverrides.tsx')
    const service = readFile('src/services/renshe.ts')

    expect(service).toContain("listPrograms(): Promise<RensheProgram[]>")
    expect(service).toContain("'/admin/cert-products/renshe/programs'")
    expect(source).toContain('rensheService.listPrograms()')
    expect(source).toContain('program_code: programs[0]?.program_code')
    expect(source).toContain("message='当前支持的报考项目'")
    expect(source).toContain("title: '报考项目'")
    expect(source).toContain('plan.occupation_name')
    expect(source).toContain('plan.skill_level')
    expect(source).not.toContain('label="产品"')
    expect(source).not.toContain('label="职业">信息安全管理员')
  })

  it('shows the real batch program in workbench and application review', () => {
    const workbench = readFile('src/pages/certification/components/vendors/renshe/BatchWorkbench.tsx')
    const drawer = readFile('src/pages/certification/components/vendors/renshe/ApplicationDetailDrawer.tsx')
    const types = readFile('src/types/renshe.ts')

    expect(workbench).toContain("label='报考项目'")
    expect(workbench).toContain("label='技能等级'")
    expect(workbench).toContain("label='考试类型'")
    expect(workbench).toContain("label='申报类型'")
    expect(drawer).toContain('detail.plan.occupation_name')
    expect(drawer).toContain('detail.plan.skill_level')
    expect(types).toContain('plan: {')
  })
})
