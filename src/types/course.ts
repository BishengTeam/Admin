import type { PageParams } from './api'

export type CourseStatus = 'draft' | 'published' | 'offline' | 'archived'
export type CourseLifecycleAction = 'publish' | 'offline' | 'archive' | 'restore'
export type VideoSourceType = 'external_url' | 'course_asset'

export interface CourseCategory {
  id: number
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseItem {
  id: number
  title: string
  category: string
  description: string | null
  cover_url: string | null
  price: number
  teacher_name: string | null
  teacher_contact: string | null
  free_preview_seconds: number | null
  status: CourseStatus
  bound_quiz_library_count: number
  enrollment_count: number
  created_at: string
  updated_at: string
}

export interface CourseMutation {
  title: string
  category: string
  description?: string | null
  cover_url?: string | null
  price: number
  teacher_name?: string | null
  teacher_contact?: string | null
  free_preview_seconds?: number | null
}

export interface CourseFilter extends PageParams {
  keyword?: string
  category?: string
  status?: CourseStatus
  price_type?: 'free' | 'paid'
  bound_quiz?: boolean
  created_from?: string
  created_to?: string
}

export interface CourseChapter {
  id: number
  title: string
  video_url: string | null
  video_source_type: VideoSourceType
  asset_id: number | null
  duration: number | null
  sort_order: number
  is_preview: boolean
}

export interface CourseAsset {
  id: number
  course_id: number
  title: string
  storage_key: string
  asset_type: string
  sort_order: number
  is_preview: boolean
  created_at: string
}

export interface CourseEnrollment {
  id: number
  user_id: number
  course_id: number
  course_title: string
  order_id: number | null
  order_status: string | null
  order_price: number | null
  active_entitlement_count: number
  entitlement_sources: string[]
  status: string
  learning_access: boolean
  access_granted_at: string | null
  access_revoked_at: string | null
  created_at: string
}

export interface CourseQuizBinding {
  id: number
  course_id: number
  library_id: number
  library_name: string
  library_code: string
  status: 'active' | 'inactive'
  lock_version: number
  created_at: string
  updated_at: string
}

export interface CourseBindingImpact {
  course_id: number
  library_id: number
  course_status: CourseStatus
  library_status: string
  active_enrollment_count: number
  existing_entitlement_count: number
  candidates_to_backfill: number
  active_session_count: number
  other_active_source_count: number
  can_execute: boolean
  blockers: string[]
}

export interface CourseEntitlementJobItem {
  id: number
  enrollment_id: number
  user_id: number
  status: 'pending' | 'succeeded' | 'failed'
  error_message: string | null
}

export interface CourseEntitlementJob {
  id: number
  course_id: number
  library_id: number
  action: 'backfill' | 'revoke'
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed'
  batch_size: number
  total_count: number
  processed_count: number
  success_count: number
  failure_count: number
  retry_count: number
  last_error: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
  failed_items: CourseEntitlementJobItem[]
}

export interface CourseAuditItem {
  id: number
  actor_type: 'admin' | 'system' | 'user'
  actor_id: number | null
  action: string
  object_type: string
  object_id: number | null
  result: 'succeeded' | 'failed'
  changed_fields: Record<string, unknown> | null
  summary: Record<string, unknown> | null
  request_id: string | null
  ip_address: string | null
  created_at: string
}
