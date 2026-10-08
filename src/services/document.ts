import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type {
  DocumentCreatePayload,
  DocumentResource,
  DocumentUpdatePayload,
} from '@/types/document'

const PDF_HEADERS = { 'Content-Type': 'multipart/form-data' }

export const documentService = {
  async list(
    params: {
      keyword?: string
      document_key?: string
      scene?: string
      is_active?: boolean
    } & PageParams,
  ): Promise<PageData<DocumentResource>> {
    return http.get<PageData<DocumentResource>>('/admin/documents', { params })
  },

  async detail(id: number): Promise<DocumentResource> {
    return http.get<DocumentResource>(`/admin/documents/${id}`)
  },

  async create(data: DocumentCreatePayload, file: File): Promise<DocumentResource> {
    const form = new FormData()
    form.append('document_key', data.document_key)
    if (data.scene != null) form.append('scene', data.scene)
    form.append('title', data.title)
    if (data.entry_text != null) form.append('entry_text', data.entry_text)
    if (data.description != null) form.append('description', data.description)
    form.append('is_active', String(data.is_active))
    form.append('file', file)
    return http.post<DocumentResource>('/admin/documents', form, {
      headers: PDF_HEADERS,
    })
  },

  async update(id: number, data: DocumentUpdatePayload): Promise<DocumentResource> {
    return http.put<DocumentResource>(`/admin/documents/${id}`, data)
  },

  async replaceFile(id: number, file: File): Promise<DocumentResource> {
    const form = new FormData()
    form.append('file', file)
    return http.post<DocumentResource>(`/admin/documents/${id}/file`, form, {
      headers: PDF_HEADERS,
    })
  },
}
