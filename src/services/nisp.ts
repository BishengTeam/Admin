import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'

export interface NispBatch {
  id: number
  plan_id: number
  level: '1' | '2'
  plan_name: string
  plan_status: string
  apply_start: string | null
  apply_end: string | null
  exam_date: string | null
  exam_location: string | null
  capacity: number
  occupied_count: number
  training_org: string | null
  training_teacher: string | null
  training_address: string | null
  training_start: string | null
  training_end: string | null
  level1_price_cents: number
  level2_price_cents: number
  created_at: string
  updated_at: string
}

export interface NispRegistration {
  id: number
  registration_no: string
  batch_id: number
  level: '1' | '2'
  status: string
  candidate_snapshot: Record<string, unknown>
  order_status: string
  price_cents: number
  resubmission_count: number
  rejection_count: number
  created_at: string
  latest_review: {
    decision: string
    reason_code: string | null
    reason_detail: string | null
    rejected_material_types?: string[] | null
    reviewed_at: string
  } | null
  materials: NispMaterial[]
}

export interface NispMaterial {
  id: number
  material_type: 'id_card_both_sides' | 'portrait_photo' | 'xuexin_report' | 'application_form'
  version_no: number | null
  storage_key: string
  original_filename: string | null
  content_type: string | null
  size_bytes: number | null
  sha256: string | null
  is_current: boolean
  preview_url: string | null
  uploaded_at: string | null
}

export interface NispExportJob {
  id: number
  batch_id: number
  level: '1' | '2'
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  artifact_type: 'excel' | 'full_package'
  registration_count: number
  storage_key: string | null
  artifact_bytes: number | null
  expires_at: string | null
  last_error: string | null
  result_summary: {
    missing_count?: number
    missing_materials?: Array<{
      registration_no: string
      name: string
      missing_materials: string[]
    }>
    packages?: Array<{ registration_no: string; name: string; filename: string }>
  } | null
  created_at: string
}

export const nispService = {
  listBatches(params: PageParams): Promise<PageData<NispBatch>> {
    return http.get('/admin/nisp/batches', { params })
  },

  createBatch(data: {
    plan_id: number
    level: '1' | '2'
    training_org?: string
    training_teacher?: string
    training_address?: string
    training_start?: string
    training_end?: string
    level1_price_cents: number
    level2_price_cents: number
  }): Promise<NispBatch> {
    return http.post('/admin/nisp/batches', data)
  },

  publishBatch(id: number): Promise<NispBatch> {
    return http.post(`/admin/nisp/batches/${id}/publish`)
  },

  closeRegistration(id: number): Promise<NispBatch> {
    return http.post(`/admin/nisp/batches/${id}/close-registration`)
  },

  cancelBatch(id: number): Promise<NispBatch> {
    return http.post(`/admin/nisp/batches/${id}/cancel`)
  },

  listRegistrations(params: PageParams & {
    batch_id?: number
    level?: string
    status?: string
  }): Promise<PageData<NispRegistration>> {
    return http.get('/admin/nisp/registrations', { params })
  },

  getRegistration(id: number): Promise<NispRegistration> {
    return http.get(`/admin/nisp/registrations/${id}`)
  },

  reviewRegistration(id: number, data: {
    decision: 'approved' | 'rejected'
    reason_code?: string
    reason_detail?: string
    rejected_material_types?: NispMaterial['material_type'][]
    allowed_fields?: string[]
  }): Promise<NispRegistration> {
    return http.post(`/admin/nisp/registrations/${id}/review`, data)
  },
  rejectAndRefund(
    id: number,
    data: { reason_code: string; reason_detail: string },
    reauthToken: string,
  ): Promise<NispRegistration> {
    return http.post(`/admin/nisp/registrations/${id}/reject-refund`, data, {
      headers: { 'X-Reauth-Token': reauthToken },
    })
  },

  createExport(batchId: number, level: string): Promise<NispExportJob> {
    return http.post('/admin/nisp/export', {
      batch_id: batchId, level, include_statuses: ['approved'],
    })
  },
}
