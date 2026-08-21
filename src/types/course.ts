export type CourseStatus = 'draft' | 'published' | 'offline' | 'archived'
export type CourseUploadKind = 'cover' | 'chapter_video'
export type CourseUploadStatus =
  | 'pending'
  | 'completed'
  | 'bound'
  | 'aborted'
  | 'expired'

export interface CourseCategory {
  id: number
  name: string
  sort_order: number
  is_active: boolean
}

export interface CourseItem {
  id: number
  title: string
  category: string
  description?: string | null
  cover_url: string
  price: number
  price_yuan: string
  teacher_name?: string | null
  teacher_contact?: string | null
  preview_chapter_count: number
  status: CourseStatus
  bound_quiz_library_count: number
  enrollment_count: number
  created_at: string
  updated_at: string
}

export interface CourseChapter {
  id: number
  course_id: number
  title: string
  video_storage_key: string
  original_filename: string
  content_type: string
  size_bytes: number
  duration: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CourseUploadPart {
  part_number: number
  size_bytes: number
  etag: string
}

export interface CourseUpload {
  id: number
  course_id?: number | null
  kind: CourseUploadKind
  filename: string
  content_type: string
  size_bytes: number
  part_size: number
  status: CourseUploadStatus
  title?: string | null
  duration?: number | null
  sort_order?: number | null
  object_key: string
  oss_upload_id: string
  upload_url?: string | null
  expires_at: string
  completed_at?: string | null
  parts: CourseUploadPart[]
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

export interface CourseQuizBinding {
  id: number
  course_id: number
  library_id: number
  library_name: string
  library_code: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface CourseEntitlementJob {
  id: number
  course_id: number
  library_id: number
  action: 'backfill' | 'revoke'
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed'
  total_count: number
  success_count: number
  failure_count: number
  finished_at?: string | null
}

export interface CourseEnrollment {
  id: number
  user_id: number
  course_id: number
  course_title: string
  order_id?: number | null
  order_status?: string | null
  order_price?: number | null
  active_entitlement_count: number
  status: string
  learning_access: boolean
  created_at: string
}

export interface CourseAuditItem {
  id: number
  actor_type: 'admin' | 'system' | 'user'
  actor_id?: number | null
  action: string
  object_type: string
  object_id?: number | null
  result: 'succeeded' | 'failed'
  request_id?: string | null
  changed_fields?: Record<string, unknown> | null
  summary?: Record<string, unknown> | null
  created_at: string
}
