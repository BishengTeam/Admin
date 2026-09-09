import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type {
  AgreementTemplateCreatePayload,
  AgreementTemplateItem,
  AgreementTemplateUpdatePayload,
} from '@/types/agreementTemplate'

export const agreementTemplateService = {
  /** GET /admin/agreement-templates — 含历史版本 */
  async list(
    params: { type?: string; status?: string } & PageParams,
  ): Promise<PageData<AgreementTemplateItem>> {
    return http.get<PageData<AgreementTemplateItem>>('/admin/agreement-templates', { params })
  },

  /** POST /admin/agreement-templates — 新建即生效（同类型旧版自动归档） */
  async create(data: AgreementTemplateCreatePayload): Promise<AgreementTemplateItem> {
    return http.post<AgreementTemplateItem>('/admin/agreement-templates', data)
  },

  /** PUT /admin/agreement-templates/:id — 编辑保存生成新版本并归档旧版 */
  async update(
    id: number,
    data: AgreementTemplateUpdatePayload,
  ): Promise<AgreementTemplateItem> {
    return http.put<AgreementTemplateItem>(`/admin/agreement-templates/${id}`, data)
  },

  /** PUT /admin/agreement-templates/:id/archive — 归档生效中的模板 */
  async archive(id: number): Promise<AgreementTemplateItem> {
    return http.put<AgreementTemplateItem>(`/admin/agreement-templates/${id}/archive`)
  },
}
