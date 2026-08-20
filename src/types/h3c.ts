export type H3cRegistrationType = 'coupon' | 'student' | 'full'
export type H3cRegistrationStatus =
  | 'pending_payment'
  | 'pending_review'
  | 'rejected_awaiting_resubmission'
  | 'pending_refund_confirmation'
  | 'refund_processing'
  | 'approved'
  | 'refunded_closed'
  | 'cancelled'

export interface H3cPriceOption {
  registration_type: H3cRegistrationType
  price_cents: number
}

export interface H3cExamBatch {
  id: number
  plan_id: number
  certification_code: string
  name: string
  status: string
  apply_start: string
  apply_end: string
  exam_date: string
  capacity: number
  occupied_count: number
  remaining_count: number
  exam_location: string | null
  description: string | null
  sort_order: number
  exam_code: string
  identity_tag: string
  country: string
  language: string
  training_org: string | null
  training_teacher: string | null
  training_address: string | null
  training_start: string | null
  training_end: string | null
  payment_timeout_minutes: number
  resubmission_window_hours: number
  max_resubmissions: number
  max_material_bytes: number
  prices: H3cPriceOption[]
  published_at: string | null
  registration_closed_at: string | null
  cancelled_at: string | null
  finalized_at: string | null
  created_at: string
  updated_at: string
}

export type H3cExamBatchPayload = Partial<Omit<H3cExamBatch, 'id' | 'plan_id' | 'status' | 'occupied_count' | 'remaining_count' | 'prices' | 'published_at' | 'registration_closed_at' | 'cancelled_at' | 'finalized_at' | 'created_at' | 'updated_at'>>

export interface H3cMaterial {
  id: number
  material_type: string
  version_no: number
  storage_key: string
  preview_url: string | null
  original_filename: string
  size_bytes: number
  sha256: string
  is_current: boolean
  uploaded_at: string
}

export interface H3cReview {
  id: number
  decision: 'approved' | 'rejected'
  reason_code: string | null
  reason_detail: string | null
  rejected_material_types: string[] | null
  reviewer_admin_id: number
  reviewed_at: string
}

export interface H3cRegistration {
  id: number
  registration_no: string
  batch_id: number
  plan_id: number
  order_id: number
  registration_type: H3cRegistrationType
  status: H3cRegistrationStatus
  candidate_snapshot: Record<string, unknown>
  order_status: string
  price_cents: number
  out_trade_no: string | null
  paid_at: string | null
  resubmission_count: number
  rejection_count: number
  resubmission_due_at: string | null
  last_reviewed_at: string | null
  approved_at: string | null
  materials: H3cMaterial[]
  latest_review: H3cReview | null
  created_at: string
  updated_at: string
}

export interface H3cRefund {
  id: number
  registration_id: number
  order_id: number
  request_kind: string
  reason_code: string
  reason_detail: string | null
  amount_cents: number
  status: string
  approved_by_admin_id: number | null
  approved_at: string | null
  out_refund_no: string | null
  processing_at: string | null
  succeeded_at: string | null
  last_error: string | null
  created_at: string
}

export interface H3cExportJob {
  id: number
  batch_id: number
  registration_type: H3cRegistrationType
  artifact_type: 'embedded_xlsx' | 'images_zip'
  include_statuses: H3cRegistrationStatus[]
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  registration_count: number
  started_at: string | null
  finished_at: string | null
  storage_key: string | null
  artifact_sha256: string | null
  artifact_bytes: number | null
  expires_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}
