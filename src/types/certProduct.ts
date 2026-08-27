import type { PageData } from './api'

export interface CertProduct {
  id: number
  type: string
  code: string
  name: string
  chinese_name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CertProductCreatePayload {
  type: string
  code: string
  name: string
  chinese_name: string
  description?: string
  is_active?: boolean
  sort_order?: number
}

export interface CertProductUpdatePayload {
  code?: string
  name?: string
  chinese_name?: string
  description?: string
  is_active?: boolean
  sort_order?: number
}

export interface CertProductStats {
  type: string
  type_label: string
  product_count: number
  active_product_count: number
  active_batch_count: number
  total_enrolled: number
}
