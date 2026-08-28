import { http } from '@/core/request'
import type { CertCatalogItem, CertProduct, CertProductCreatePayload, CertProductStats, CertProductUpdatePayload } from '@/types/certProduct'
import type { PageData, PageParams } from '@/types/api'

export const certProductService = {
  async getCatalog(type?: string): Promise<CertCatalogItem[]> {
    return http.get<CertCatalogItem[]>('/admin/cert-products/catalog', { params: { type } })
  },

  async list(params: { type?: string; keyword?: string } & PageParams): Promise<PageData<CertProduct>> {
    return http.get<PageData<CertProduct>>('/admin/cert-products', { params })
  },

  async get(code: string): Promise<CertProduct> {
    return http.get<CertProduct>(`/admin/cert-products/${code}`)
  },

  async create(data: CertProductCreatePayload): Promise<CertProduct> {
    return http.post<CertProduct>('/admin/cert-products', data)
  },

  async update(code: string, data: CertProductUpdatePayload): Promise<CertProduct> {
    return http.put<CertProduct>(`/admin/cert-products/${code}`, data)
  },

  async deactivate(code: string): Promise<void> {
    return http.delete<void>(`/admin/cert-products/${code}`)
  },

  async getStats(): Promise<CertProductStats[]> {
    return http.get<CertProductStats[]>('/admin/cert-products/stats')
  },
}
