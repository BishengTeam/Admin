export interface DashboardStats {
  total_users: number
  total_conversations: number
  transfer_rate: number
  total_orders: number
  payment_success_rate: number
  total_revenue: number
}

export interface ConversionTrend {
  date: string
  browse: number
  cart: number
  order: number
  payment: number
}

export interface QualityDistribution {
  name: string
  value: number
}

export interface RevenueTrend {
  date: string
  amount: number
}

export interface SchoolRegistration {
  school: string
  count: number
  rank: number
}

export interface DashboardData {
  stats: DashboardStats
  conversion_trend: ConversionTrend[]
  quality_distribution: QualityDistribution[]
  revenue_trend: RevenueTrend[]
  school_registrations: SchoolRegistration[]
}
