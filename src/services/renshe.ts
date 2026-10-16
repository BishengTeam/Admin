import { http } from '@/core/request'
import type { RensheProject, RensheProjectWrite, RensheCapabilities } from '@/types/rensheProject'
import type { CertificationPlan } from '@/types/certification'
import type { PageData } from '@/types/api'
import type {
  RensheBatchExternalReviewPayload,
  RensheBatchExternalReviewResult,
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

export interface RensheProgram {
  program_code: string
  occupation_name: string
  occupation_code: string
  skill_level: string
  exam_type: string
  application_type: string
}

export const rensheService = {
  downloadRegistrationTemplate: () => http.get<Blob>('/admin/cert-products/renshe/export-template', { responseType: 'blob' }),
  uploadCommitmentTemplate: (file: File) => {
    const data = new FormData()
    data.append('file', file)
    return http.post<{ filename: string; sha256: string; original_filename: string }>('/admin/cert-products/renshe/commitment-templates', data, { timeout: 60000 })
  },
  downloadCommitmentTemplate: (filename: string) => http.get<Blob>(`/admin/cert-products/renshe/commitment-templates/${encodeURIComponent(filename)}`, { responseType: 'blob' }),
  listProjects: () => http.get<RensheProject[]>('/admin/cert-products/renshe/projects'),
  projectCapabilities: () => http.get<RensheCapabilities>('/admin/cert-products/renshe/project-capabilities'),
  createProject: (data: RensheProjectWrite) => http.post<RensheProject>('/admin/cert-products/renshe/projects', data),
  updateProject: (id: number, data: RensheProjectWrite) => http.put<RensheProject>(`/admin/cert-products/renshe/projects/${id}`, data),
  deleteProject: (id: number) => http.delete<void>(`/admin/cert-products/renshe/projects/${id}`),
  listBatches: () => http.get<CertificationPlan[]>('/admin/cert-products/renshe/batches'),
  async listPrograms(): Promise<RensheProgram[]> {
    return http.get<RensheProgram[]>('/admin/cert-products/renshe/programs')
  },

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

  async returnForCorrection(
    applicationId: number,
    data: RensheReviewPayload,
  ): Promise<RensheReview> {
    return http.post<RensheReview>(
      `/admin/cert-products/renshe/applications/${applicationId}/return-correction`,
      data,
    )
  },

  async batchExternalReview(
    data: RensheBatchExternalReviewPayload,
  ): Promise<{ items: RensheBatchExternalReviewResult[] }> {
    return http.post<{ items: RensheBatchExternalReviewResult[] }>(
      '/admin/cert-products/renshe/external-reviews/batch',
      data,
    )
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

  async createExportJob(planId: number, applicationIds?: number[]): Promise<RensheExportJob> {
    return http.post<RensheExportJob>(
      `/admin/cert-products/renshe/plans/${planId}/exports`,
      applicationIds?.length ? { application_ids: applicationIds } : {},
    )
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
