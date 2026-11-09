/**
 * 认证批次管理 API v2
 */
import request from '@/core/request'

export interface TimeSegment {
  id: number
  label: string
  start_time: string
  end_time: string
  sort_order: number
}

export interface BatchProduct {
  id: number
  plan_id: number
  product_id: number
  product_code: string
  product_name: string
  product_type: string
  capacity: number
  enrolled: number
  remaining: number | null
  renshe_config_id?: number | null
  occupation_name?: string | null
  occupation_code?: string | null
  skill_level?: string | null
  exam_type?: string | null
  application_type?: string | null
}

export interface Batch {
  id: number
  name: string
  apply_start: string | null
  apply_end: string | null
  exam_date: string | null
  exam_location: string | null
  description: string | null
  contact_name: string | null
  contact_phone: string | null
  sort_order: number
  status: 'draft' | 'published' | 'registration_closed' | 'finalized' | 'archived' | 'cancelled'
  published_at: string | null
  registration_closed_at: string | null
  cancelled_at: string | null
  finalized_at: string | null
  created_at: string | null
  updated_at: string | null
  products: BatchProduct[]
  time_segments: TimeSegment[]
  total_enrolled: number
}

export interface BatchListItem {
  id: number
  name: string
  status: Batch['status']
  apply_start: string | null
  apply_end: string | null
  exam_date: string | null
  product_count: number
  total_enrolled: number
}

export interface BatchPayload {
  name: string
  apply_start?: string | null
  apply_end?: string | null
  exam_date?: string | null
  exam_location?: string | null
  description?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  sort_order?: number
  products?: Array<{
    product_id: number
    capacity: number
    renshe_config_id?: number | null
    occupation_name?: string | null
    occupation_code?: string | null
    skill_level?: string | null
    exam_type?: string | null
    application_type?: string | null
  }>
  time_segments?: Array<{
    label: string
    start_time: string
    end_time: string
    sort_order?: number
  }>
}

export const batchService = {
  async list(params?: { status?: string; page?: number; page_size?: number }) {
    return request.get<{ items: BatchListItem[]; total: number }>('/admin/certifications/batches', { params })
  },

  async get(id: number): Promise<Batch> {
    return request.get(`/admin/certifications/batches/${id}`)
  },

  async create(data: BatchPayload): Promise<Batch> {
    return request.post('/admin/certifications/batches', data)
  },

  async update(id: number, data: Partial<BatchPayload>): Promise<Batch> {
    return request.put(`/admin/certifications/batches/${id}`, data)
  },

  async remove(id: number): Promise<void> {
    return request.delete(`/admin/certifications/batches/${id}`)
  },

  async publish(id: number): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${id}/publish`)
  },

  async closeRegistration(id: number): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${id}/close-registration`)
  },

  async finalize(id: number): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${id}/finalize`)
  },

  async cancel(id: number): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${id}/cancel`)
  },

  async archive(id: number): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${id}/archive`)
  },

  async addProduct(batchId: number, data: Omit<BatchProduct, 'id' | 'plan_id' | 'product_code' | 'product_name' | 'product_type' | 'enrolled' | 'remaining'>): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${batchId}/products`, data)
  },

  async updateProduct(batchId: number, ppId: number, data: Partial<BatchProduct>): Promise<Batch> {
    return request.put(`/admin/certifications/batches/${batchId}/products/${ppId}`, data)
  },

  async removeProduct(batchId: number, ppId: number): Promise<Batch> {
    return request.delete(`/admin/certifications/batches/${batchId}/products/${ppId}`)
  },

  async addTimeSegment(batchId: number, data: Omit<TimeSegment, 'id'>): Promise<Batch> {
    return request.post(`/admin/certifications/batches/${batchId}/time-segments`, data)
  },

  async updateTimeSegment(batchId: number, tsId: number, data: Partial<TimeSegment>): Promise<Batch> {
    return request.put(`/admin/certifications/batches/${batchId}/time-segments/${tsId}`, data)
  },

  async removeTimeSegment(batchId: number, tsId: number): Promise<Batch> {
    return request.delete(`/admin/certifications/batches/${batchId}/time-segments/${tsId}`)
  },
}
