export interface CompetitionTrack {
  id: number
  name: string
  max_participants: number
  enrolled: number
  remaining: number | null
  sort_order: number
}

/** 在线查阅附件（后端已把 PDF 转成页图，仅可见不可下载） */
export interface CompetitionAttachment {
  title: string
  pages: string[]
}

export interface Competition {
  id: number
  name: string
  description: string | null
  cover_url: string | null
  home_cover_url?: string | null
  poster_url?: string | null
  start_time: string | null
  end_time: string | null
  registration_deadline: string | null
  is_active: boolean
  tracks: CompetitionTrack[]
  total_enrolled?: number
  created_at: string
  custom_fields?: unknown[] | null
  attachments?: CompetitionAttachment[] | null
}


export interface CompetitionTrackInput {
  /** 更新时携带原赛道 id，保留已有报名关联 */
  id?: number | null
  name: string
  max_participants: number
  sort_order: number
}

export interface CompetitionPayload {
  name: string
  description?: string | null
  cover_url?: string | null
  home_cover_url?: string | null
  poster_url?: string | null
  start_time?: string | null
  end_time?: string | null
  registration_deadline?: string | null
  is_active?: boolean
  tracks?: CompetitionTrackInput[]
  custom_fields?: unknown[] | null
  attachments?: CompetitionAttachment[] | null
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
