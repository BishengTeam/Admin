export interface Certification {
  id: number
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

export type PlanStatus = 'draft' | 'published' | 'archived' | 'cancelled'

export const PLAN_STATUS_MAP: Record<PlanStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
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
}
