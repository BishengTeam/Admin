export interface User {
  id: number
  openid: string
  phone: string
  is_active: boolean
  created_at: string
}

export interface UserFilter {
  openid?: string
  phone?: string
  created_at_start?: string
  created_at_end?: string
}

export interface UserDetail extends User {
  phone: string
  email?: string
  school?: string
  identity?: UserIdentityInfo
  profile?: UserProfileDetail
  orders?: UserOrderSummary[]
  conversations?: UserConversationSummary[]
}

/** 用户完整个人资料，对应后端 UserProfileDetail */
export interface UserProfileDetail {
  id: number
  openid: string
  phone: string | null
  email: string | null
  real_name: string | null
  id_card: string | null
  user_type: string | null
  gender: string | null
  education: string | null
  school: string | null
  major: string | null
  organization: string | null
  identity_status: string | null
  created_at: string
  phone_raw: string | null
  id_card_raw: string | null
  pinyin: string | null
  first_name: string | null
  last_name: string | null
  age: number | null
  country: string
  language: string
}

/** 实名认证信息，对应后端 UserIdentityResponse */
export interface UserIdentityInfo {
  user_type: 'student' | 'enterprise'
  real_name: string
  id_card_number: string
  id_card_front_oss: string | null
  id_card_back_oss: string | null
  student_card_oss: string | null
  status: 'pending' | 'verified' | 'rejected'
  verified_at: string | null
  created_at: string
}

export const IDENTITY_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  verified: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
}

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
