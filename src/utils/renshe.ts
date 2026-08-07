import type { CertificationPlan } from '@/types/certification'
import type { RensheCleanupRun, RensheMaterialKind } from '@/types/renshe'

export const RENSHE_PRODUCT_CODE = 'RS-ZY'

export const RENSHE_APPLICATION_STATUS_MAP: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  pending_payment: { text: '待支付', color: 'gold' },
  pending_initial_review: { text: '待初审', color: 'orange' },
  initial_rejected: { text: '初审驳回', color: 'red' },
  pending_external_review: { text: '待外审', color: 'blue' },
  external_rejected: { text: '外审驳回', color: 'red' },
  external_approved: { text: '外审通过', color: 'green' },
  closed: { text: '已关闭', color: 'default' },
}

export const RENSHE_PAYMENT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'gold' },
  paid: { text: '已支付', color: 'green' },
  completed: { text: '已完成', color: 'green' },
  refunded: { text: '已退款', color: 'blue' },
  closed: { text: '已关闭', color: 'default' },
}

export const RENSHE_MATERIAL_LABELS: Record<RensheMaterialKind, string> = {
  id_card_front: '身份证正面',
  id_card_back: '身份证背面',
  portrait: '证件照',
  student_card: '学生证',
  xuexin_registration: '学信网电子注册表',
  education_proof: '学历证明',
}

export const RENSHE_REVIEW_STAGE_LABELS = {
  initial: '初审',
  external: '外审',
} as const

export function formatBytes(value: number | null | undefined): string {
  if (value == null) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MiB`
  return `${(value / 1024 ** 3).toFixed(2)} GiB`
}

export function isPdfMaterial(filename?: string | null, contentType?: string | null): boolean {
  return contentType === 'application/pdf' || Boolean(filename && /\.pdf(?:$|\?)/i.test(filename))
}

export function isRensheProduct(productType?: string | null): boolean {
  if (!productType) return false
  return ['RS-ZY', 'renshe', '人社认证'].includes(productType)
}

export function isPlanCleanupLocked(
  plan: CertificationPlan | null | undefined,
  runs: RensheCleanupRun[],
  now = Date.now(),
): boolean {
  if (!plan) return true
  if (plan.cleanup_due_at && new Date(plan.cleanup_due_at).getTime() <= now) return true
  return runs.some((run) => run.status !== 'scheduled')
}

export function isPlanExportLocked(
  plan: CertificationPlan | null | undefined,
  runs: RensheCleanupRun[],
  now = Date.now(),
): boolean {
  if (!plan || ['draft', 'cancelled', 'archived'].includes(plan.status)) return true
  return isPlanCleanupLocked(plan, runs, now)
}
