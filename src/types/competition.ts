export interface CompetitionTrack {
  id: number
  name: string
  max_participants: number
  enrolled: number
  remaining: number | null
  sort_order: number
}

export interface Competition {
  id: number
  name: string
  description: string | null
  cover_url: string | null
  start_time: string | null
  end_time: string | null
  registration_deadline: string | null
  is_active: boolean
  tracks: CompetitionTrack[]
  total_enrolled?: number
  created_at: string
}

export interface CompetitionTrackInput {
  name: string
  max_participants: number
  sort_order: number
}

export interface CompetitionPayload {
  name: string
  description?: string | null
  cover_url?: string | null
  start_time?: string | null
  end_time?: string | null
  registration_deadline?: string | null
  is_active?: boolean
  tracks?: CompetitionTrackInput[]
}

export interface CompetitionRegistration {
  id: number
  user_id: number
  competition_name: string
  track: string | null
  track_id: number | null
  school: string
  real_name: string | null
  phone: string | null
  created_at: string | null
}
