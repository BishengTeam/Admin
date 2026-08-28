import type { PageData } from './api'

export type CertPriceUserType = 'student' | 'normal'

export interface CertProductPrice {
  user_type: CertPriceUserType
  price_cents: number
}

export interface CertCatalogItem {
  id: number
  type: string
  code: string
  name: string
  duration_minutes: number | null
  question_count: number | null
  total_score: number | null
  pass_score: number | null
  cert_validity_years: number | null
  retake_count: number | null
  prerequisite: string | null
  remark: string | null
  source: string | null
  instantiated: boolean
}

export interface CertProduct {
  id: number
  type: string
  code: string
  name: string
  chinese_name: string
  description: string | null
  is_active: boolean
  sort_order: number
  prices: CertProductPrice[]
  created_at: string
  updated_at: string
}

export interface CertProductCreatePayload {
  type: string
  catalog_id?: number | null
  code: string
  name: string
  chinese_name: string
  description?: string
  is_active?: boolean
  sort_order?: number
  prices?: CertProductPrice[]
}

export interface CertProductUpdatePayload {
  code?: string
  name?: string
  chinese_name?: string
  description?: string
  is_active?: boolean
  sort_order?: number
  prices?: CertProductPrice[]
}

export interface CertProductStats {
  type: string
  type_label: string
  product_count: number
  active_product_count: number
  active_batch_count: number
  total_enrolled: number
}
