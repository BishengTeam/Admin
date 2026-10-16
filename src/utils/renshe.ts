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
  registration_portrait: '一寸白底近期证件照（≤500 KB）',
  graduation_certificate: '毕业证',
  education_report: '学信网学历备案表',
  commitment_letter: '承诺书（签字按手印）',
  social_security_proof: '社保缴费证明',
  vocational_qualification_certificate: '职业资格证书',
  professional_title_certificate: '职称证书',
}

export const RENSHE_GRADUATED_CHECKS: Record<string, string> = {
  identity: '实名信息与全部佐证材料属于同一人', graduated: '已取得毕业证，不使用在读替代材料',
  education: '学历证明与学信网电子注册表对应且可验证', major: '本专业或规定相关专业（核对专业目录，别名人工判断）',
  employment: '社保、职业资格或职称佐证与报送信息相符', photo: '二寸、免冠、近期且规格合格', commitment: '承诺书完整，本人亲笔签名并按手印',
}
export const RENSHE_GRADUATED_CHANGE_OPTIONS = Object.entries({
  'reporting_info.occupation_status': '从事职业', 'reporting_info.ethnicity': '民族', 'reporting_info.political_status': '政治面貌',
  'reporting_info.has_work_experience': '工作经历', 'reporting_info.work_start_date': '参加工作日期', 'reporting_info.enrollment_date': '入学日期',
  'reporting_info.occupation_years': '职业年限', 'reporting_info.work_unit': '工作单位', 'reporting_info.social_insurance_unit': '社保参保单位',
  id_card_front: '身份证正面（需实名更正）', id_card_back: '身份证背面（需实名更正）',
  portrait: '二寸免冠照片（需实名更正）', social_security_proof: '社保缴费证明', xuexin_registration: '学信网电子注册表',
  education_proof: '学历证明', vocational_qualification_certificate: '职业资格证书', professional_title_certificate: '职称证书', commitment_letter: '承诺书',
  'education_info.school': '毕业院校', 'education_info.institution_type': '院校类型', 'education_info.education': '学历层次',
  'education_info.major': '所学专业', 'education_info.graduation_date': '毕业日期', 'education_info.certificate_number': '毕业证书编号',
  contact_phone: '手机号', email: '邮箱', mailing_address: '通讯地址',
}).map(([value, label]) => ({ value, label }))

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
