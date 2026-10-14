import { http } from '@/core/request'

export interface ConsultationGroupConfig {
  plan_id: number
  qrcode_url?: string
  join_instructions?: string | null
  expires_at?: string | null
  version: number
  status: 'configured' | 'expired' | 'not_configured'
  updated_by?: number | null
  updated_at?: string
}

export interface ConsultationGroupUpdatePayload {
  qrcode_url?: string | null
  join_instructions?: string | null
  expires_at?: string | null
  version: number
}

export const consultationGroupService = {
  async get(planId: number): Promise<ConsultationGroupConfig> {
    return http.get<ConsultationGroupConfig>(
      `/admin/cert-products/consultation-groups/${planId}`,
    )
  },

  async update(
    planId: number,
    data: ConsultationGroupUpdatePayload,
  ): Promise<ConsultationGroupConfig> {
    return http.put<ConsultationGroupConfig>(
      `/admin/cert-products/consultation-groups/${planId}`,
      data,
    )
  },
}
