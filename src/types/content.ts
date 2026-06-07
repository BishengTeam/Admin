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

export interface CourseBatch {
  /** 上课日期 YYYY-MM-DD */
  class_date: string
  /** 开始时间 HH:mm */
  start_time: string
  /** 结束时间 HH:mm */
  end_time: string
  /** 价格（分） */
  price: number
  /** 上课地点 */
  location: string
}

export interface Course {
  id: number
  title: string
  category: string
  price: number
  is_active: boolean
  teacher_name: string
  teacher_contact: string
  created_at: string
  batches: CourseBatch[] | null
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
