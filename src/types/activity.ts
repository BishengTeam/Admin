export interface Activity {
  id: number
  title: string
  description: string | null
  cover_url: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  max_participants: number
  is_active: boolean
  related_cert_id: number | null
  related_course_id: number | null
  live_url: string | null
  group_qrcode_url: string | null
  registration_deadline: string | null
  created_at: string
  updated_at: string
}

export interface ActivityRegistration {
  id: number
  activity_id: number
  user_id: number
  name: string
  phone: string
  remark: string | null
  created_at: string
}
