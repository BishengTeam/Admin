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
  consultation_group_qrcode_url: string | null
  level1_price_cents: number
  level2_price_cents: number
  registration_counts?: Record<string, number>
  created_at: string
  updated_at: string
}

export interface NispRegistration {
  id: number
  registration_no: string
  batch_id: number
  level: '1' | '2'
  status: string
  active_refund?: {
    id: number
    status: string
    out_refund_no: string | null
    processing_at: string | null
    succeeded_at: string | null
    last_error: string | null
    retry_count: number
  } | null
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
  final_export_item_id?: number | null
  latest_valid_export_job_id?: number | null
  latest_valid_export_finished_at?: string | null
  final_review_ready?: boolean
  final_review_block_reason?: string | null
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
  requested_by_admin_id: number
  requested_by_admin_name?: string | null
  valid_item_count: number
  registration_ids: number[]
  file_expired: boolean
  download_available: boolean
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

export interface NispExportPrecheckPerson {
  registration_id: number
  registration_no: string
  name: string
  level: '1' | '2'
  status: string
  exportable: boolean
  reason: string | null
}

export interface NispExportPrecheckResponse {
  selected_count: number
  exportable_count: number
  blocked_count: number
  level: '1' | '2'
  exportable_registration_ids: number[]
  people: NispExportPrecheckPerson[]
}

export interface NispExportItem {
  id: number
  job_id: number
  registration_id: number
  registration_no: string
  name: string
  level: '1' | '2'
  current_status: string
  version_no: number | null
  is_valid: boolean
  invalidated_reason: string | null
  review_ready: boolean
  block_reason: string | null
  created_at: string
}

export interface NispBatchFinalReviewTarget {
  registration_id: number
  export_item_id: number
}

export interface NispBatchFinalReviewResult {
  registration_id: number
  export_item_id?: number | null
  registration_no?: string | null
  name?: string | null
  success: boolean
  status: 'success' | 'skipped' | 'failed'
  reason: string | null
}

export const nispService = {
  listBatches(params: PageParams): Promise<PageData<NispBatch>> {
    return http.get('/admin/nisp/batches', { params })
  },

  getBatch(id: number): Promise<NispBatch> {
    return http.get(`/admin/nisp/batches/${id}`)
  },

  createBatch(data: {
    plan_id: number
    level: '1' | '2'
    training_org?: string
    training_teacher?: string
    training_address?: string
    training_start?: string
    training_end?: string
    consultation_group_qrcode_url?: string | null
    level1_price_cents: number
    level2_price_cents: number
  }): Promise<NispBatch> {
    return http.post('/admin/nisp/batches', data)
  },

  updateBatch(
    id: number,
    data: { consultation_group_qrcode_url?: string | null },
  ): Promise<NispBatch> {
    return http.put(`/admin/nisp/batches/${id}`, data)
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
    keyword?: string
    has_valid_export?: boolean
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
  finalReview(
    id: number,
    exportItemId: number,
    reasonDetail: string,
    reauthToken: string,
  ): Promise<NispRegistration> {
    return http.post(`/admin/nisp/registrations/${id}/final-review`, {
      decision: 'approved',
      export_item_id: exportItemId,
      reason_detail: reasonDetail,
    }, { headers: { 'X-Reauth-Token': reauthToken } })
  },
  batchFinalReview(
    exportJobId: number,
    registrationIds: number[],
    reauthToken: string,
  ): Promise<{ items: Array<{ registration_id: number; success: boolean; reason: string | null }> }> {
    return http.post('/admin/nisp/final-reviews/batch', {
      export_job_id: exportJobId,
      registration_ids: registrationIds,
    }, { headers: { 'X-Reauth-Token': reauthToken } })
  },

  batchFinalReviewTargets(
    targets: NispBatchFinalReviewTarget[],
    reauthToken: string,
  ): Promise<{ items: NispBatchFinalReviewResult[] }> {
    return http.post('/admin/nisp/final-reviews/batch', {
      targets,
    }, { headers: { 'X-Reauth-Token': reauthToken } })
  },

  createExport(
    batchId: number,
    level?: string,
    registrationIds?: number[],
    includeStatuses?: string[],
  ): Promise<NispExportJob> {
    return http.post('/admin/nisp/export', {
      batch_id: batchId,
      level,
      include_statuses: includeStatuses?.length ? includeStatuses : ['approved'],
      registration_ids: registrationIds,
    })
  },

  precheckExport(data: {
    batch_id: number
    registration_ids?: number[]
    status?: string
    keyword?: string
  }): Promise<NispExportPrecheckResponse> {
    return http.post('/admin/nisp/export/precheck', data)
  },

  listExportJobs(params: PageParams & { batch_id?: number }): Promise<PageData<NispExportJob>> {
    return http.get('/admin/nisp/export/jobs', { params })
  },

  listExportItems(
    jobId: number,
    params: PageParams & {
      current_status?: string
      is_valid?: boolean
      keyword?: string
    },
  ): Promise<PageData<NispExportItem>> {
    return http.get(`/admin/nisp/export/jobs/${jobId}/items`, { params })
  },

  getExportSignedUrl(id: number): Promise<{ url: string; expires_at: string }> {
    return http.get(`/admin/nisp/export/jobs/${id}/signed-url`)
  },
}
