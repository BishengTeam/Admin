export interface Training {
  id: number
  title: string
  cover_url: string | null
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  max_participants: number
  is_active: boolean
  created_at: string
}
