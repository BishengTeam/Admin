import type { PageParams } from '@/types/api'

export type RensheApplicationStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_initial_review'
  | 'initial_rejected'
  | 'pending_external_review'
  | 'external_rejected'
  | 'external_approved'
  | 'closed'

export type RenshePaymentStatus = 'pending' | 'paid' | 'completed' | 'refunded' | 'closed'

export type RensheMaterialKind =
  | 'id_card_front'
  | 'id_card_back'
  | 'portrait'
  | 'student_card'
  | 'xuexin_registration'
  | 'education_proof'

export interface RensheApplicationFilter extends PageParams {
  plan_id?: number
  status?: RensheApplicationStatus
  payment_status?: RenshePaymentStatus
  keyword?: string
  submitted_at_start?: string
  submitted_at_end?: string
}

export interface RensheApplicationListItem {
  id: number
  plan_id: number
  user_id: number
  current_version_id: number | null
  status: RensheApplicationStatus
  candidate_name: string | null
  id_card_masked: string | null
  contact_phone_masked: string | null
  payment_order_id: number | null
  payment_status: string | null
  submitted_at: string | null
  frozen_at: string | null
  created_at: string
  updated_at: string
}

export interface RensheMaterial {
  id: number
  application_id: number
  version_id: number
  kind: RensheMaterialKind
  original_filename: string
  content_type: string
  size_bytes: number
  sha256: string
  is_deleted: boolean
  deleted_at: string | null
}

export type RensheReviewStage = 'initial' | 'external'
export type RensheReviewDecision = 'approved' | 'rejected'

export interface RensheReviewPayload {
  decision: RensheReviewDecision
  reason?: string
  required_changes?: string[]
}

export interface RensheReview {
  id: number
  application_id: number
  version_id: number
  stage: RensheReviewStage
  decision: RensheReviewDecision
  reason: string | null
  required_changes: string[] | null
  reviewer_id: number
  reviewed_at: string
}

export interface RensheReviewCorrectionPayload {
  to_decision: RensheReviewDecision
  reason: string
}

export interface RensheReviewCorrection {
  id: number
  review_id: number
  application_id: number
  corrected_by_admin_id: number
  from_decision: RensheReviewDecision
  to_decision: RensheReviewDecision
  reason: string
  created_at: string
}

export interface RensheApplicationVersion {
  id: number
  version_no: number
  submitted_at: string
  realname_snapshot: Record<string, unknown>
  student_snapshot: Record<string, unknown>
  form_data: Record<string, unknown>
  sensitive_cleared_at: string | null
  materials: RensheMaterial[]
  reviews: RensheReview[]
}

export interface RensheApplicationDetail {
  id: number
  plan_id: number
  user_id: number
  current_version_id: number | null
  status: RensheApplicationStatus
  draft_data: Record<string, unknown> | null
  submitted_at: string | null
  frozen_at: string | null
  freeze_reason: string | null
  closed_at: string | null
  close_reason: string | null
  created_at: string
  updated_at: string
  versions: RensheApplicationVersion[]
  current_order_id: number | null
  current_order_status: string | null
  current_refund_id?: number | null
  current_refund_status?: string | null
}

export interface RensheSignedUrl {
  url: string
  expires_in: number
}

export type RensheExportStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface RensheExportVolume {
  id: number
  job_id: number
  volume_no: number
  status: RensheExportStatus
  candidate_count: number
  size_bytes: number | null
  sha256: string | null
  finished_at: string | null
  last_error: string | null
  download_available: boolean
}

export interface RensheExportJob {
  id: number
  plan_id: number
  generation_no: number
  requested_by_admin_id: number
  status: RensheExportStatus
  candidate_total: number
  candidate_processed: number
  volume_count: number
  heartbeat_at: string | null
  started_at: string | null
  finished_at: string | null
  retry_count: number
  last_error: string | null
  volumes: RensheExportVolume[]
}

export type RensheRefundStatus = 'requested' | 'approved' | 'processing' | 'succeeded' | 'rejected' | 'failed'

export interface RensheRefundFilter extends PageParams {
  status?: RensheRefundStatus
}

export interface RensheRefund {
  id: number
  application_id: number
  order_id: number
  user_id: number
  request_kind: 'normal' | 'exception' | 'batch_cancel' | 'batch_finalize'
  reason_code: string
  reason_detail: string | null
  amount_cents: number
  status: RensheRefundStatus
  requested_at: string
  due_at: string
  rejection_reason: string | null
  succeeded_at: string | null
  last_error: string | null
}

export interface RensheRefundDecisionPayload {
  decision: 'approved' | 'rejected'
  reason?: string
}

export type RensheCleanupStatus = 'scheduled' | 'running' | 'paused' | 'succeeded' | 'failed'

export interface RensheCleanupRun {
  id: number
  plan_id: number
  run_no: number
  status: RensheCleanupStatus
  due_at: string
  paused_reason: string | null
  heartbeat_at: string | null
  started_at: string | null
  finished_at: string | null
  retry_count: number
  rebase_count: number
  last_error: string | null
}
