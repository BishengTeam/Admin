export type UserStatus = 'active' | 'banned'

export interface User {
  id: number
  avatar: string
  username: string
  phone: string
  status: UserStatus
  register_time: string
}

export interface UserFilter {
  username?: string
  phone?: string
  register_date_range?: [string, string]
}

export interface UserDetail extends User {
  email?: string
  school?: string
  created_at: string
  orders: UserOrderSummary[]
  conversations: UserConversationSummary[]
}

export interface UserOrderSummary {
  id: number
  order_no: string
  amount: number
  status: string
  created_at: string
}

export interface UserConversationSummary {
  id: number
  message: string
  intent: string
  created_at: string
}
