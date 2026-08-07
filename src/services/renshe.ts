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
    return http.get<PageData<RensheApplicationListItem>>('/admin/renshe/applications', { params })
  },

  async getApplication(applicationId: number): Promise<RensheApplicationDetail> {
    return http.get<RensheApplicationDetail>(`/admin/renshe/applications/${applicationId}`)
  },

  async reviewApplication(
    applicationId: number,
    stage: RensheReviewStage,
    data: RensheReviewPayload,
  ): Promise<RensheReview> {
    return http.post<RensheReview>(`/admin/renshe/applications/${applicationId}/${stage}-review`, data)
  },

  async correctReview(reviewId: number, data: RensheReviewCorrectionPayload): Promise<RensheReviewCorrection> {
    return http.post<RensheReviewCorrection>(`/admin/renshe/reviews/${reviewId}/corrections`, data)
  },

  async getMaterialSignedUrl(materialId: number, download = false): Promise<RensheSignedUrl> {
    return http.get<RensheSignedUrl>(`/admin/renshe/materials/${materialId}/signed-url`, {
      params: { download },
    })
  },

  async getVerificationMaterialSignedUrl(
    userId: number,
    kind: RensheMaterialKind,
    download = false,
  ): Promise<RensheSignedUrl> {
    return http.get<RensheSignedUrl>(`/admin/renshe/users/${userId}/verification-materials/${kind}/signed-url`, {
      params: { download },
    })
  },

  async listExportJobs(planId: number): Promise<RensheExportJob[]> {
    return http.get<RensheExportJob[]>(`/admin/renshe/plans/${planId}/exports`)
  },

  async createExportJob(planId: number): Promise<RensheExportJob> {
    return http.post<RensheExportJob>(`/admin/renshe/plans/${planId}/exports`)
  },

  async getExportJob(jobId: number): Promise<RensheExportJob> {
    return http.get<RensheExportJob>(`/admin/renshe/exports/${jobId}`)
  },

  async retryExportJob(jobId: number): Promise<RensheExportJob> {
    return http.post<RensheExportJob>(`/admin/renshe/exports/${jobId}/retry`)
  },

  async getExportVolumeSignedUrl(volumeId: number): Promise<RensheSignedUrl> {
    return http.get<RensheSignedUrl>(`/admin/renshe/export-volumes/${volumeId}/signed-url`)
  },

  async listRefunds(params: RensheRefundFilter): Promise<PageData<RensheRefund>> {
    return http.get<PageData<RensheRefund>>('/admin/renshe/refunds', { params })
  },

  async decideRefund(refundId: number, data: RensheRefundDecisionPayload): Promise<RensheRefund> {
    return http.post<RensheRefund>(`/admin/renshe/refunds/${refundId}/decision`, data)
  },

  async listCleanupRuns(planId: number): Promise<RensheCleanupRun[]> {
    return http.get<RensheCleanupRun[]>(`/admin/renshe/plans/${planId}/cleanup-runs`)
  },

  async retryCleanupRun(runId: number): Promise<RensheCleanupRun> {
    return http.post<RensheCleanupRun>(`/admin/renshe/cleanup-runs/${runId}/retry`)
  },
}
