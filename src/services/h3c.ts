import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type {
  H3cExamBatch,
  H3cExamBatchPayload,
  H3cExportJob,
  H3cRefund,
  H3cRegistration,
  H3cRegistrationStatus,
  H3cRegistrationType,
} from '@/types/h3c'

function reauthHeaders(token: string) {
  return { headers: { 'X-Reauth-Token': token } }
}

export const h3cService = {
  listBatches(params: PageParams & { status?: string }): Promise<PageData<H3cExamBatch>> {
    return http.get('/admin/cert-products/h3c/batches', { params })
  },
  createBatch(data: H3cExamBatchPayload): Promise<H3cExamBatch> {
    return http.post('/admin/cert-products/h3c/batches', data)
  },
  updateBatch(id: number, data: H3cExamBatchPayload): Promise<H3cExamBatch> {
    return http.put(`/admin/cert-products/h3c/batches/${id}`, data)
  },
  publishBatch(id: number): Promise<H3cExamBatch> {
    return http.post(`/admin/cert-products/h3c/batches/${id}/publish`)
  },
  closeBatchRegistration(id: number): Promise<H3cExamBatch> {
    return http.post(`/admin/cert-products/h3c/batches/${id}/close-registration`)
  },
  finalizeBatch(id: number): Promise<H3cExamBatch> {
    return http.post(`/admin/cert-products/h3c/batches/${id}/finalize`)
  },
  cancelBatch(id: number, reauthToken: string): Promise<H3cExamBatch> {
    return http.post(`/admin/cert-products/h3c/batches/${id}/cancel`, {}, reauthHeaders(reauthToken))
  },
  listRegistrations(params: PageParams & {
    batch_id?: number
    registration_type?: H3cRegistrationType
    status?: H3cRegistrationStatus
  }): Promise<PageData<H3cRegistration>> {
    return http.get('/admin/cert-products/h3c/registrations', { params })
  },
  reviewRegistration(id: number, data: {
    decision: 'approved' | 'rejected'
    reason_code?: string
    reason_detail?: string
    rejected_material_types?: string[]
  }): Promise<H3cRegistration> {
    return http.post(`/admin/cert-products/h3c/registrations/${id}/review`, data)
  },
  closeRegistration(id: number, reason: string, reauthToken: string): Promise<H3cRegistration> {
    return http.post(
      `/admin/cert-products/h3c/registrations/${id}/close`,
      { reason_detail: reason },
      reauthHeaders(reauthToken),
    )
  },
  listRefunds(params: PageParams & { status?: string }): Promise<PageData<H3cRefund>> {
    return http.get('/admin/cert-products/h3c/refunds', { params })
  },
  confirmRefund(id: number, reauthToken: string): Promise<H3cRefund> {
    return http.post(
      `/admin/cert-products/h3c/refunds/${id}/confirm`,
      {},
      reauthHeaders(reauthToken),
    )
  },
  createExport(data: {
    batch_id: number
    registration_type: H3cRegistrationType
    artifact_type: 'embedded_xlsx' | 'images_zip'
    include_statuses: H3cRegistrationStatus[]
  }): Promise<H3cExportJob> {
    return http.post('/admin/cert-products/h3c/exports', data)
  },
  listExports(params: PageParams & { batch_id?: number; status?: string }): Promise<PageData<H3cExportJob>> {
    return http.get('/admin/cert-products/h3c/exports', { params })
  },
  getExportUrl(id: number, reauthToken: string): Promise<{ url: string; expires_in: number }> {
    return http.get(`/admin/cert-products/h3c/exports/${id}/download-url`, reauthHeaders(reauthToken))
  },
}
