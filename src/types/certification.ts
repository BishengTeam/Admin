export interface Certification {
  id: number
  name: string
  chinese_name: string
  code: string
  vendor: string
  normal_price: number
  student_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CertificationPayload {
  code: string
  vendor: string
  normal_price: number
  student_price: number
  is_active: boolean
}

export type PlanStatus = 'draft' | 'published' | 'registration_closed' | 'finalized' | 'archived' | 'cancelled'

export const PLAN_STATUS_MAP: Record<PlanStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  registration_closed: { text: '报名已关闭', color: 'orange' },
  finalized: { text: '已终结', color: 'blue' },
  archived: { text: '已归档', color: 'blue' },
  cancelled: { text: '已取消', color: 'red' },
}

export interface CertificationPlan {
  id: number
  product_type: string
  name: string
  apply_start: string | null
  apply_end: string | null
  exam_date: string | null
  capacity: number
  occupation_name: string
  occupation_code: string
  skill_level: string
  exam_type: string
  application_type: string
  price_cents: number
  exam_location: string | null
  description: string | null
  contact_name: string | null
  contact_phone: string | null
  sort_order: number
  published_at: string | null
  registration_closed_at: string | null
  cancelled_at: string | null
  finalized_at: string | null
  cleanup_due_at: string | null
  enrolled: number
  status: PlanStatus
  created_at: string
  updated_at: string
}

export interface CertificationPlanPayload {
  name: string
  apply_start?: string | null
  apply_end?: string | null
  exam_date?: string | null
  capacity?: number | null
  price_cents?: number
  exam_location?: string | null
  description?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  sort_order?: number
}
