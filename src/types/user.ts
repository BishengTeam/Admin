export interface User {
  id: number
  openid: string
  phone: string
  is_active: boolean
  identity_status?: string | null      // 实名审核状态
  student_status?: string | null       // 学生信息审核状态
  enterprise_status?: string | null    // 企业信息审核状态
  created_at: string
}

export interface UserFilter {
  openid?: string
  phone?: string
  created_at_start?: string
  created_at_end?: string
  identity_status?: string
  student_status?: string
  enterprise_status?: string
}

export interface UserDetail extends User {
  phone: string
  profile?: UserProfile
  realname?: UserRealnameInfo
  student?: UserStudentInfo
  enterprise?: UserEnterpriseInfo
  orders?: UserOrderSummary[]
  conversations?: UserConversationSummary[]
}

/** GET /admin/users/{id}/profile 平铺聚合响应（所有字段在一层） */
export interface UserProfileDetail {
  id: number
  openid: string
  // level-1: user_profile
  nickname: string | null
  email: string | null
  phone: string | null
  province: string | null
  city: string | null
  address: string | null
  // level-2: user_realname
  user_type: string | null
  last_name_zh: string | null
  first_name_zh: string | null
  last_name_en: string | null
  first_name_en: string | null
  real_name: string | null
  id_card: string | null
  id_card_raw: string | null
  id_card_front_oss: string | null
  id_card_back_oss: string | null
  avatar_oss: string | null
  birth_date: string | null
  gender: string | null
  age: number | null
  census_register: string | null
  zip_code: string | null
  political_status: string | null
  ethnicity: string | null
  identity_status: string | null
  identity_reject_reason: string | null
  // level-2: user_student
  education: string | null
  school: string | null
  major: string | null
  student_card_oss: string | null
  enrollment_pdf_oss: string | null
  degree_cert_oss: string | null
  student_status: string | null
  student_reject_reason: string | null
  // level-2: user_enterprise
  organization: string | null
  enterprise_status: string | null
  enterprise_reject_reason: string | null
  // 编辑次数
  edit_count: number | null
  edit_count_limit: number | null
  edit_count_reset_hours: number | null
  created_at: string
}

// ============ Level 1: 用户可自由修改 ============

/** 抽屉展示用 level-1 结构（从 UserProfileDetail 映射） */
export interface UserProfile {
  nickname: string | null
  email: string | null
  phone: string | null
}

// ============ Level 2: 审核后生效 ============

/** 对应 user_realname 表 */
export interface UserRealnameInfo {
  user_id: number
  user_type: 'student' | 'enterprise'
  last_name_zh: string | null
  first_name_zh: string | null
  last_name_en: string | null
  first_name_en: string | null
  real_name: string
  id_card_number: string
  id_card_front_oss: string | null
  id_card_back_oss: string | null
  avatar_oss: string | null
  birth_date: string | null
  gender: string | null
  age: number | null
  census_register: string | null
  zip_code: string | null
  political_status: string | null
  ethnicity: string | null
  status: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
  verified_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
}

/** 对应 user_student 表 */
export interface UserStudentInfo {
  user_id: number
  education: string | null
  school: string | null
  major: string | null
  student_card_oss: string | null
  enrollment_pdf_oss: string | null
  degree_cert_oss: string | null
  status: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
  verified_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
}

/** 对应 user_enterprise 表 */
export interface UserEnterpriseInfo {
  user_id: number
  organization: string | null
  status: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
  verified_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
}

/** 审核状态映射（realname / student / enterprise 通用） */
export const LEVEL2_STATUS_MAP: Record<string, { text: string; color: string }> = {
  unsubmitted: { text: '未提交', color: 'default' },
  pending: { text: '待审核', color: 'orange' },
  verified: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
}

// ============ 向后兼容 ============

/** @deprecated 使用 UserRealnameInfo + UserStudentInfo + UserEnterpriseInfo */
export { LEVEL2_STATUS_MAP as IDENTITY_STATUS_MAP }

export interface UserOrderSummary {
  id: number
  out_trade_no: string
  price: number
  status: string
  created_at: string
}

export interface UserConversationSummary {
  id: number
  message: string
  intent: string
  created_at: string
}

/** GET /admin/reviews 审核记录 */
export interface ReviewRecord {
  id: number
  target_type: string
  target_id: number
  reviewer_id: number
  action: string
  comment: string | null
  created_at: string
}
