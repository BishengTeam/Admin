export interface Ticket {
  id: number
  user_id: number
  teacher_id: number | null
  content: string | null
  status: string
  created_at: string
  updated_at: string
}

export type TicketStatus = 'waiting_manual' | 'processing' | 'resolved'
