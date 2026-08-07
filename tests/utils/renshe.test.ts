import { describe, expect, it } from 'vitest'
import type { CertificationPlan } from '@/types/certification'
import type { RensheCleanupRun } from '@/types/renshe'
import { formatBytes, isPdfMaterial, isPlanCleanupLocked, isPlanExportLocked, isRensheProduct } from '@/utils/renshe'

const plan = {
  id: 12,
  cleanup_due_at: '2026-08-10T00:00:00+08:00',
} as CertificationPlan

function cleanup(status: RensheCleanupRun['status']): RensheCleanupRun {
  return { status } as RensheCleanupRun
}

describe('renshe utilities', () => {
  it('locks exports after cleanup starts or reaches its deadline', () => {
    const beforeDeadline = new Date('2026-08-09T00:00:00+08:00').getTime()
    const afterDeadline = new Date('2026-08-11T00:00:00+08:00').getTime()

    expect(isPlanCleanupLocked(plan, [cleanup('scheduled')], beforeDeadline)).toBe(false)
    expect(isPlanCleanupLocked(plan, [cleanup('running')], beforeDeadline)).toBe(true)
    expect(isPlanCleanupLocked(plan, [], afterDeadline)).toBe(true)
    expect(isPlanExportLocked({ ...plan, status: 'cancelled' }, [], beforeDeadline)).toBe(true)
    expect(isPlanExportLocked({ ...plan, status: 'published' }, [], beforeDeadline)).toBe(false)
  })

  it('recognizes private material and product formats', () => {
    expect(isPdfMaterial('proof.PDF')).toBe(true)
    expect(isPdfMaterial('proof.bin', 'application/pdf')).toBe(true)
    expect(isPdfMaterial('portrait.jpg', 'image/jpeg')).toBe(false)
    expect(isRensheProduct('RS-ZY')).toBe(true)
    expect(isRensheProduct('H3C-NE')).toBe(false)
    expect(formatBytes(10 * 1024 ** 3)).toBe('10.00 GiB')
  })
})
