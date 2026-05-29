export type ContentStatus = 'online' | 'offline'

export interface ContentItem {
  id: number
  title: string
  zone: string
  cover_url: string
  description: string
  external_url: string
  sort_weight: number
  status: ContentStatus
  created_at: string
}

export interface Banner {
  id: number
  image_url: string
  jump_link: string
  sort: number
  start_time: string
  end_time: string
  status: ContentStatus
}

export interface Course {
  id: number
  name: string
  category: string
  price: number
  class_count: number
  status: ContentStatus
  teacher_name: string
  teacher_contact: string
  created_at: string
  schedules: ClassSchedule[]
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
