import type { CertificationPlan } from '@/types/certification'

/**
 * 静默刷新后水合仍打开的项目管理弹窗。
 * 只按批次 ID 替换数据，不重新打开已关闭的弹窗，也不切换到其他批次。
 */
export function hydrateProjectManager(
  current: CertificationPlan | null,
  rows: CertificationPlan[],
): CertificationPlan | null {
  if (!current) return null
  return rows.find(item => item.id === current.id) ?? current
}
