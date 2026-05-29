import request from '@/core/request'
import type { ContentItem, Banner, Course } from '@/types/content'
import type { PageData, PageParams } from '@/types/api'

export const contentService = {
  // Zones
  async list(params: { keyword?: string } & PageParams): Promise<PageData<ContentItem>> {
    return request.get('/admin/content/zones', { params })
  },

  async create(data: Partial<ContentItem>): Promise<ContentItem> {
    return request.post('/admin/content/zones', data)
  },

  async update(id: number, data: Partial<ContentItem>): Promise<void> {
    return request.put(`/admin/content/zones/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return request.delete(`/admin/content/zones/${id}`)
  },

  async deleteZones(ids: number[]): Promise<void> {
    return request.post('/admin/content/zones/batch-delete', { ids })
  },

  async toggleStatus(id: number, status: string): Promise<void> {
    return request.patch(`/admin/content/zones/${id}/status`, { status })
  },

  async updateSort(updates: { id: number; sort_weight: number }[]): Promise<void> {
    return request.put('/admin/content/zones/sort', updates)
  },

  // Banners
  async listBanners(): Promise<Banner[]> {
    return request.get('/admin/content/banners')
  },

  async createBanner(data: Partial<Banner>): Promise<Banner> {
    return request.post('/admin/content/banners', data)
  },

  async updateBanner(id: number, data: Partial<Banner>): Promise<void> {
    return request.put(`/admin/content/banners/${id}`, data)
  },

  async deleteBanner(id: number): Promise<void> {
    return request.delete(`/admin/content/banners/${id}`)
  },

  async deleteBanners(ids: number[]): Promise<void> {
    return request.post('/admin/content/banners/batch-delete', { ids })
  },

  // Courses
  async listCourses(params: { keyword?: string; category?: string } & PageParams): Promise<PageData<Course>> {
    return request.get('/admin/content/courses', { params })
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    return request.post('/admin/content/courses', data)
  },

  async updateCourse(id: number, data: Partial<Course>): Promise<void> {
    return request.put(`/admin/content/courses/${id}`, data)
  },

  async deleteCourse(id: number): Promise<void> {
    return request.delete(`/admin/content/courses/${id}`)
  },
}
