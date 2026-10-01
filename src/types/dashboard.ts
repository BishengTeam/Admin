export interface TrendPoint {
  date: string
  value: number
}

export interface PieDataItem {
  name: string
  value: number
}

export interface CertStatusData {
  h3c: { pending_review: number; approved: number }
  nisp: { pending_review: number; approved: number }
}

export interface DashboardData {
  // Core
  total_users: number
  total_orders: number
  recent_orders_30d: number
  paid_orders: number
  revenue_fen: number
  recent_revenue_30d_fen: number
  conversion_rate: number

  // Quiz
  quiz_questions_total?: number
  quiz_libraries_total?: number
  quiz_attempts_today?: number
  quiz_attempts_30d?: number

  // Certification
  h3c_pending_review?: number
  h3c_approved?: number
  nisp_pending_review?: number
  nisp_approved?: number

  // Course
  courses_total?: number

  // Competition
  competitions_active?: number
  competition_registrations?: number

  // Classroom
  classrooms_active?: number

  // Trends (30 days)
  revenue_trend?: TrendPoint[]
  user_trend?: TrendPoint[]
  quiz_trend?: TrendPoint[]
  order_type_distribution?: PieDataItem[]
  cert_status?: CertStatusData
}
