export interface ContentItem {
  id: number
  title: string
  zone_type: string
  cover_url: string
  description: string
  link_url: string
  sort_order: number
  is_active: boolean
  is_banner: boolean
  start_time: string | null
  end_time: string | null
  created_at: string
}

export interface CourseSchedule {
  /** 上课日期 YYYY-MM-DD */
  class_date: string
  /** 开始时间 HH:mm */
  start_time: string
  /** 结束时间 HH:mm */
  end_time: string
  /** 上课地点 */
  location?: string | null
}

export type CourseSchedules = Record<string, CourseSchedule>

export interface Course {
  id: number
  title: string
  category: string
  cover_url: string | null
  description: string | null
  video_url: string | null
  price: number
  is_active: boolean
  teacher_name: string
  teacher_contact: string
  created_at: string
  batches: CourseSchedules | null
}

export interface ClassSchedule {
  id?: number
  course_id?: number
  class_date: string
  start_time: string
  end_time: string
  price: number
  location: string
}

export type CourseEnrollmentStatus =
  | 'pending_payment'
  | 'enrolled'
  | 'completed'
  | 'refunded'
  | 'cancelled'
  | 'expired'

export interface CourseEnrollment {
  id: number
  user_id: number
  course_id: number
  course_title: string
  order_id: number | null
  order_status: string | null
  order_price: number | null
  batch_selected: string | null
  status: CourseEnrollmentStatus
  learning_access: boolean
  access_granted_at: string | null
  access_revoked_at: string | null
  created_at: string
}

export interface CourseEnrollmentFilter {
  course_id?: number
  user_id?: number
  status?: CourseEnrollmentStatus
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
