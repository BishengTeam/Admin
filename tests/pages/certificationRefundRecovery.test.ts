import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('certification refund recovery display', () => {
  it('shows failed refund state in H3C and NISP batch workbenches', () => {
    for (const path of [
      'src/pages/certification/components/vendors/h3c/BatchExportWorkbench.tsx',
      'src/pages/certification/components/vendors/nisp/BatchWorkbench.tsx',
    ]) {
      const source = readSource(path)
      expect(source, path).toContain('registrationRefundStatus')
      expect(source, path).toContain('refundRetryDescription')
      expect(source, path).toContain('active_refund')
    }
  })

  it('shows failed refund state in shared review drawers and refund lists', () => {
    for (const path of [
      'src/pages/certification/components/vendors/h3c/RegistrationReviewDrawer.tsx',
      'src/pages/certification/components/vendors/nisp/RegistrationReviewDrawer.tsx',
    ]) {
      const source = readSource(path)
      expect(source, path).toContain('registrationRefundStatus')
      expect(source, path).toContain('refundRetryDescription')
    }
  })

  it('explains refund failures in refund lists', () => {
    for (const path of [
      'src/pages/certification/components/vendors/h3c/RefundTab.tsx',
      'src/pages/certification/components/vendors/nisp/RefundTab.tsx',
      'src/pages/certification/components/vendors/renshe/RefundTab.tsx',
    ]) {
      const source = readSource(path)
      expect(source, path).toContain('refundErrorText')
    }
  })

  it('explains Renshe refund failures in the application drawer', () => {
    const source = readSource(
      'src/pages/certification/components/vendors/renshe/ApplicationDetailDrawer.tsx',
    )

    expect(source).toContain('current_refund_last_error')
    expect(source).toContain('current_refund_retry_count')
    expect(source).toContain('refundErrorText')
  })
})
