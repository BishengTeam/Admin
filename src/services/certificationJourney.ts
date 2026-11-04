import { http } from '@/core/request'
import type { CertType } from '@/pages/certification/components/vendors/type-registry'

export interface NoticeBlock { type: 'text' | 'image'; text: string; url: string; caption: string }
export interface JourneyContent {
  version: number; title: string; blocks: NoticeBlock[]
  contact_name: string; contact_phone: string; contact_wechat: string; service_hours: string
}
export interface JourneyCatalog {
  title: string; batches: Array<{ id: number; plan_id: number; name: string; subject_id: string; status: string }>
  subjects: Array<{ id: string; name: string }>
}
export const certificationJourneyService = {
  catalog(type: CertType) { return http.get<JourneyCatalog>(`/admin/certification-journeys/${type}/catalog`) },
  content(type: CertType, planId?: number) { return http.get<JourneyContent>(`/admin/certification-journeys/${type}/content`, { params: { plan_id: planId } }) },
  save(type: CertType, value: JourneyContent, planId?: number) { return http.put<JourneyContent>(`/admin/certification-journeys/${type}/content`, value, { params: { plan_id: planId } }) },
}
