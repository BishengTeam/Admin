export interface ContentItem {
  id: number
  title: string
  zone_type: string
  cover_url: string
  description: string
  link_url: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Banner {
  id: number
  image_url: string
  jump_link: string
  sort: number
  start_time: string
  end_time: string
  is_active: boolean
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
  batches: Record<string, any> | null
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
