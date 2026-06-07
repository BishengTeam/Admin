export interface Job {
  id: number
  title: string
  company: string
  location: string | null
  salary_range: string | null
  description: string | null
  requirements: string | null
  contact_info: string | null
  is_active: boolean
  created_at: string
}
