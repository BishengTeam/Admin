import { http } from '@/core/request'
import type { Certification, CertificationPayload, CertificationPlan, CertificationPlanPayload } from '@/types/certification'
import type { PageData, PageParams } from '@/types/api'

export const certificationService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Certification>> {
    return http.get<PageData<Certification>>('/admin/certifications', { params })
  },
  async create(data: CertificationPayload): Promise<Certification> {
    return http.post<Certification>('/admin/certifications', data)
  },
  async update(id: number, data: Partial<CertificationPayload>): Promise<void> {
    return http.put<void>(`/admin/certifications/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/certifications/${id}`)
  },
  async export(params?: { keyword?: string }): Promise<Blob> {
    return http.get<Blob>('/admin/certifications/export', { params, responseType: 'blob' })
  },
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
}
