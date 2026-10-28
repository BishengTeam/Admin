import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('certification refund workbench', () => {
  it('replaces the three standalone refund pages with one shared implementation', () => {
    const shared = readSource('src/components/RefundWorkbench.tsx')

    expect(shared).toContain('pending: [')
    expect(shared).toContain('processing: [')
    expect(shared).toContain('abnormal: [')
    expect(shared).toContain('待处理')
    expect(shared).toContain('处理中')
    expect(shared).toContain('异常')
    expect(shared).toContain('全部记录')
    expect(shared).toContain('所属批次')
    expect(shared).toContain('姓名 / 订单号')
    expect(shared).toContain('registrationId')
    expect(shared).toContain('进入报名详情')
    expect(shared).toContain('h3cService.confirmRefund')
    expect(shared).toContain('nispService.confirmRefund')
    expect(shared).toContain('nispService.reconcileRefund')
    expect(shared).toContain('rensheService.decideRefund')

    for (const vendor of ['h3c', 'nisp', 'renshe'] as const) {
      const source = readSource(
        `src/pages/certification/components/vendors/${vendor}/RefundTab.tsx`,
      )
      expect(source).toContain('RefundWorkbench')
      expect(source).toContain(`vendor='${vendor}'`)
    }
  })

  it('embeds refund records into every certification batch workbench', () => {
    const paths = [
      'src/pages/certification/components/vendors/h3c/BatchExportWorkbench.tsx',
      'src/pages/certification/components/vendors/nisp/BatchWorkbench.tsx',
      'src/pages/certification/components/vendors/renshe/BatchWorkbench.tsx',
    ]

    for (const path of paths) {
      const source = readSource(path)
      expect(source, path).toContain('RefundWorkbench')
      expect(source, path).toContain('embedded')
      expect(source, path).toContain("'退款记录'")
    }
  })

  it('links person refund summaries to the batch refund records', () => {
    const paths = [
      'src/pages/certification/components/vendors/h3c/RegistrationReviewDrawer.tsx',
      'src/pages/certification/components/vendors/nisp/RegistrationReviewDrawer.tsx',
      'src/pages/certification/components/vendors/renshe/ApplicationDetailDrawer.tsx',
    ]

    for (const path of paths) {
      const source = readSource(path)
      expect(source, path).toContain('查看退款记录')
      expect(source, path).toContain('tab=refunds')
      expect(source, path).toContain('refundRegistrationId=')
    }
  })

  it('makes NISP batch-first and removes the legacy export page', () => {
    const registry = readSource('src/pages/certification/components/vendors/vendor-registry.ts')

    expect(registry).not.toContain('./nisp/ExportTab')
    expect(registry).toContain("type: 'nisp'")
    expect(registry).toContain('batchFirst: true')
    expect(readSource('src/pages/certification/components/vendors/nisp/BatchWorkbench.tsx'))
      .toContain("setActiveTab('records')")
  })

  it('lets certification specialists reach their assigned workbench', () => {
    const routes = readSource('src/routes.tsx')
    const layout = readSource('src/layouts/AdminLayout.tsx')
    const workbench = readSource('src/pages/certification/TypeWorkbench.tsx')

    expect(routes).toContain("'h3c:refund'")
    expect(routes).toContain("'nisp:refund'")
    expect(routes).toContain("'order:list'")
    expect(layout).toContain('required.some')
    expect(workbench).toContain('hasPermission')
  })
})
