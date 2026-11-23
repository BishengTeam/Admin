import { http } from '@/core/request'
import type {
  Certification,
  CertificationPayload,
  CertificationPlan,
  CertificationPlanPayload,
  CertificationPlanProjectInput,
} from '@/types/certification'
import type { PageData, PageParams } from '@/types/api'

const MULTI_BATCH_BASE = '/admin/certifications/renshe/multi-batches'

export const certificationService = {
  async listPlans(code: string): Promise<CertificationPlan[]> {
    return http.get<CertificationPlan[]>(`/admin/certifications/${code}/plans`)
  },
  async createPlan(code: string, data: CertificationPlanPayload): Promise<CertificationPlan> {
    return http.post<CertificationPlan>(`/admin/certifications/${code}/plans`, data)
  },
  async updatePlan(code: string, planId: number, data: Partial<CertificationPlanPayload>): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`/admin/certifications/${code}/plans/${planId}`, data)
  },
  async publishPlan(code: string, planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`/admin/certifications/${code}/plans/${planId}/publish`)
  },
  async closeRegistration(code: string, planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`/admin/certifications/${code}/plans/${planId}/close-registration`)
  },
  async finalizePlan(code: string, planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`/admin/certifications/${code}/plans/${planId}/finalize`)
  },
  async archivePlan(code: string, planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`/admin/certifications/${code}/plans/${planId}/archive`)
  },
  async cancelPlan(code: string, planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`/admin/certifications/${code}/plans/${planId}/cancel`)
  },
  async deletePlan(code: string, planId: number): Promise<void> {
    return http.delete<void>(`/admin/certifications/${code}/plans/${planId}`)
  },
  async listMultiBatches(): Promise<CertificationPlan[]> {
    return http.get<CertificationPlan[]>(MULTI_BATCH_BASE)
  },
  async createMultiBatch(data: CertificationPlanPayload): Promise<CertificationPlan> {
    return http.post<CertificationPlan>(MULTI_BATCH_BASE, data)
  },
  async updateMultiBatch(planId: number, data: Partial<CertificationPlanPayload>): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}`, data)
  },
  async updateMultiProject(
    planId: number,
    projectId: number,
    data: Partial<CertificationPlanProjectInput> & { is_active?: boolean },
  ): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}/projects/${projectId}`, data)
  },
  async publishMultiBatch(planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}/publish`)
  },
  async closeMultiBatch(planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}/close-registration`)
  },
  async finalizeMultiBatch(planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}/finalize`)
  },
  async archiveMultiBatch(planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}/archive`)
  },
  async cancelMultiBatch(planId: number): Promise<CertificationPlan> {
    return http.put<CertificationPlan>(`${MULTI_BATCH_BASE}/${planId}/cancel`)
  },
  async deleteMultiBatch(planId: number): Promise<void> {
    return http.delete<void>(`${MULTI_BATCH_BASE}/${planId}`)
  },
}
