export type AgreementTemplateType = 'user_terms' | 'privacy' | 'identity_auth'
export type AgreementTemplateStatus = 'active' | 'archived'

export interface AgreementTemplateItem {
  id: number
  type: AgreementTemplateType
  title: string
  content: string
  version: number
  status: AgreementTemplateStatus
  created_at: string
  updated_at: string
}

export interface AgreementTemplateCreatePayload {
  type: AgreementTemplateType
  title: string
  content: string
}

export interface AgreementTemplateUpdatePayload {
  title: string
  content: string
}
