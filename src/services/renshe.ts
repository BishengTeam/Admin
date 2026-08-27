import { http } from '@/core/request'
import type { PageData } from '@/types/api'
import type {
  RensheApplicationDetail,
  RensheApplicationFilter,
  RensheApplicationListItem,
  RensheCleanupRun,
  RensheExportJob,
  RensheMaterialKind,
  RensheRefund,
  RensheRefundDecisionPayload,
  RensheRefundFilter,
  RensheReview,
  RensheReviewCorrection,
  RensheReviewCorrectionPayload,
  RensheReviewPayload,
  RensheReviewStage,
  RensheSignedUrl,
} from '@/types/renshe'

export const rensheService = {
  async listApplications(params: RensheApplicationFilter): Promise<PageData<RensheApplicationListItem>> {
    return http.get<PageData<RensheApplicationListItem>>('/admin/cert-products/renshe/applications', { params })
  },

  async getApplication(applicationId: number): Promise<RensheApplicationDetail> {
    return http.get<RensheApplicationDetail>(`/admin/cert-products/renshe/applications/${applicationId}`)
  },

  async reviewApplication(
    applicationId: number,
    stage: RensheReviewStage,
    data: RensheReviewPayload,
  ): Promise<RensheReview> {
    return http.post<RensheReview>(`/admin/cert-products/renshe/applications/${applicationId}/${stage}-review`, data)
  },

  async correctReview(reviewId: number, data: RensheReviewCorrectionPayload): Promise<RensheReviewCorrection> {
    return http.post<RensheReviewCorrection>(`/admin/cert-products/renshe/reviews/${reviewId}/corrections`, data)
  },

  async getMaterialSignedUrl(materialId: number, download = false): Promise<RensheSignedUrl> {
    return http.get<RensheSignedUrl>(`/admin/cert-products/renshe/materials/${materialId}/signed-url`, {
      params: { download },
    })
  },

  async getVerificationMaterialSignedUrl(
    userId: number,
    kind: RensheMaterialKind,
    download = false,
  ): Promise<RensheSignedUrl> {
    return http.get<RensheSignedUrl>(`/admin/cert-products/renshe/users/${userId}/verification-materials/${kind}/signed-url`, {
      params: { download },
    })
  },

  async listExportJobs(planId: number): Promise<RensheExportJob[]> {
    return http.get<RensheExportJob[]>(`/admin/cert-products/renshe/plans/${planId}/exports`)
  },

  async createExportJob(planId: number): Promise<RensheExportJob> {
    return http.post<RensheExportJob>(`/admin/cert-products/renshe/plans/${planId}/exports`)
  },

  async getExportJob(jobId: number): Promise<RensheExportJob> {
    return http.get<RensheExportJob>(`/admin/cert-products/renshe/exports/${jobId}`)
  },

  async retryExportJob(jobId: number): Promise<RensheExportJob> {
    return http.post<RensheExportJob>(`/admin/cert-products/renshe/exports/${jobId}/retry`)
  },

  async getExportVolumeSignedUrl(volumeId: number): Promise<RensheSignedUrl> {
    return http.get<RensheSignedUrl>(`/admin/cert-products/renshe/export-volumes/${volumeId}/signed-url`)
  },

  async listRefunds(params: RensheRefundFilter): Promise<PageData<RensheRefund>> {
    return http.get<PageData<RensheRefund>>('/admin/cert-products/renshe/refunds', { params })
  },

  async decideRefund(refundId: number, data: RensheRefundDecisionPayload): Promise<RensheRefund> {
    return http.post<RensheRefund>(`/admin/cert-products/renshe/refunds/${refundId}/decision`, data)
  },

  async listCleanupRuns(planId: number): Promise<RensheCleanupRun[]> {
    return http.get<RensheCleanupRun[]>(`/admin/cert-products/renshe/plans/${planId}/cleanup-runs`)
  },

  async retryCleanupRun(runId: number): Promise<RensheCleanupRun> {
    return http.post<RensheCleanupRun>(`/admin/cert-products/renshe/cleanup-runs/${runId}/retry`)
  },
}
