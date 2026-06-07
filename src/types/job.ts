export interface Job {
  id: number
  title: string
  company: string
  location: string | null
  salary_range: string | null
  is_active: boolean
  created_at: string
}
