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
  work_proof: '工龄证明',
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
export const RENSHE_DEGREE_CHECKS: Record<string, string> = {
  identity: '实名、毕业证及学历报告属于同一人', graduated: '已取得毕业证，不接受在读替代证明',
  education: '院校类型与学历符合本期学历型条件；参加工作日期可为空，工作信息由管理员人工审核', major: '本专业或资料列明相关专业，别名或不明确匹配人工核验',
  report: '学历备案表对应、可验证，验证有效期设置为6个月', photo: '一寸白底近期证件照，不超过500 KB', commitment: '承诺书完整、本人亲笔签名并按手印',
}
export const RENSHE_EMPLOYMENT_CHECKS: Record<string, string> = {
  identity: '实名与全部证书、工作及社保材料属于同一人',
  occupation: '实际从事本职业或资料列明相关职业，结合单位与岗位核验',
  employment: '逐段核对工作经历、去除重叠，累计有效年限满足条件',
  work_proof: '工龄证明单位鲜章、编号、手写内容、经办人及电话齐全，经办人不是考生本人',
  social_security: '社保单位与工作单位一致，时长满足要求，验证码完整有效且可验证',
  photo: '一寸白底近期证件照，不超过500 KB', commitment: '承诺书完整、本人亲笔签名并按手印',
}
export const RENSHE_GRADUATED_CHANGE_OPTIONS = Object.entries({
  'qualification_info.admission_path': '三级具体申报路径',
  'education_info.training_level': '技工院校培养层次', 'education_info.evaluation_reference': '院校评估论证依据',
  'qualification_info.title_certificate.title_name': '初级职称名称', 'qualification_info.title_certificate.level': '职称等级',
  'qualification_info.title_certificate.major': '职称专业', 'qualification_info.title_certificate.certificate_number': '职称证书编号', 'qualification_info.title_certificate.issued_on': '职称取得日期',
  work_proof: '工龄证明',
  'qualification_info.cultural_education': '文化程度', 'qualification_info.work_experiences': '逐段工作经历',
  'qualification_info.skill_certificate.occupation_name': '证书职业／工种',
  'qualification_info.skill_certificate.grade': '证书等级',
  'qualification_info.skill_certificate.certificate_number': '证书编号',
  'qualification_info.skill_certificate.issued_on': '证书取得日期',
  'reporting_info.occupation_status': '从事职业', 'reporting_info.ethnicity': '民族', 'reporting_info.political_status': '政治面貌',
  'reporting_info.has_work_experience': '工作经历', 'reporting_info.work_start_date': '参加工作日期', 'reporting_info.enrollment_date': '入学日期',
  'reporting_info.occupation_years': '职业年限', 'reporting_info.work_unit': '工作单位', 'reporting_info.social_insurance_unit': '社保参保单位',
  id_card_front: '身份证正面（需实名更正）', id_card_back: '身份证背面（需实名更正）',
  portrait: '二寸免冠照片（需实名更正）', social_security_proof: '社保缴费证明', xuexin_registration: '学信网电子注册表',
  registration_portrait: '一寸白底证件照（≤500 KB）', graduation_certificate: '毕业证', education_report: '学信网学历备案表',
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


export const RENSHE_FIELD_LABELS: Record<string, string> = {
  realname_snapshot: '实名信息', student_snapshot: '学生信息', education_info: '毕业学历信息', qualification_info: '资格信息', reporting_info: '个人补充信息',
  real_name: '姓名', id_card: '身份证号', id_card_number: '身份证号', gender: '性别', birth_date: '出生日期',
  ethnicity: '民族', political_status: '政治面貌', user_type: '用户类型', student_status: '学籍状态', candidate_source: '考生来源',
  education: '学历', school: '毕业院校／学校', major: '所学专业', enrollment_date: '入学日期',
  graduated: '已取得毕业证', institution_type: '院校类型', graduation_date: '毕业日期', certificate_number: '证书编号',
  training_level: '培养层次', evaluation_reference: '院校评估论证依据', cultural_education: '文化程度',
  occupation_name: '职业／工种', occupation_status: '从事职业', grade: '技能等级', title_name: '职称名称', level: '职称等级',
  issued_on: '证书取得日期', position: '岗位', start_date: '工作开始日期', end_date: '工作结束日期', work_unit: '工作单位',
  social_insurance_unit: '社保参保单位', work_start_date: '参加工作日期', occupation_years: '职业年限',
  has_work_experience: '参加过工作', work_experiences: '逐段工作经历', admission_path: '具体申报路径',
  skill_certificate: '技能证书', title_certificate: '职称证书', contact_phone: '联系电话', phone: '手机号',
  email: '邮箱', mailing_address: '通讯地址', as_of: '工作年限核算基准日', age_as_of: '年龄核算基准日',
  required_years: '所需职业年限', effective_years: '有效职业年限', application_condition: '申报条件',
}
const EDUCATION_NAMES: Record<string, string> = { primary: '小学', junior_high: '初中', senior_high: '高中', secondary_vocational: '中专', technical_school: '技校', vocational_high: '职高', higher_vocational: '高职', associate: '大专', bachelor: '大学本科', master: '硕士', doctorate: '博士', other: '其他' }
const REVIEW_ENUMS: Record<string, Record<string, string>> = {
  level: { primary: '初级', '初级': '初级' },
  user_type: { student: '学生', enterprise: '企业人员', social: '社会人员' },
  gender: { male: '男', female: '女', '男': '男', '女': '女' },
  education: EDUCATION_NAMES, cultural_education: EDUCATION_NAMES,
  institution_type: { technical: '技工院校', vocational: '职业院校', general_higher: '普通高等学校' },
  training_level: { senior_worker: '高级工班', preparatory_technician: '预备技师班', technician: '技师班' },
  student_status: { current_graduating_student: '在读应届毕业生' },
  admission_path: { work_10: '累计工作满10年', skill_4_work_4: '四级证书后工作满4年', title_work_1: '初级职称后工作满1年', skill_4_degree: '四级证书加毕业学历', technical_senior: '技工院校高级工班及以上毕业', evaluated_college: '经评估论证院校毕业' },
  grade: { '5': '五级／初级工', '4': '四级／中级工', '3': '三级／高级工', '2': '二级／技师', '1': '一级／高级技师' },
}
export function rensheDisplayValue(field: string, value: unknown): string {
  if (value == null || value === '') return '未填写'
  if (typeof value === 'boolean') return value ? '是' : '否'
  const key = field.split('.').slice(-1)[0] || field
  const values = REVIEW_ENUMS[key]
  return values ? values[String(value)] || '未知类型' : String(value)
}
export function rensheFieldLabel(path: string) {
  return RENSHE_GRADUATED_CHANGE_OPTIONS.find(item => item.value === path)?.label || RENSHE_FIELD_LABELS[path.split('.').slice(-1)[0] || path] || (RENSHE_MATERIAL_LABELS as Record<string, string>)[path] || '其他兼容信息'
}
