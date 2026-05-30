import request from '@/core/request'
import type { ContentItem, Banner, Course } from '@/types/content'
import type { PageData, PageParams } from '@/types/api'

export const contentService = {
  // Zones
  async list(params: { keyword?: string } & PageParams): Promise<PageData<ContentItem>> {
    return request.get('/admin/zones', { params })
  },

  async create(data: Partial<ContentItem>): Promise<ContentItem> {
    return request.post('/admin/zones', data)
  },

  async update(id: number, data: Partial<ContentItem>): Promise<void> {
    return request.put(`/admin/zones/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return request.delete(`/admin/zones/${id}`)
  },

  async deleteZones(ids: number[]): Promise<void> {
    return request.post('/admin/zones/batch-delete', { ids })
  },

  async updateSort(updates: { id: number; sort_order: number }[]): Promise<void> {
    return request.put('/admin/zones/sort', { updates })
  },

  // Banners
  async listBanners(): Promise<Banner[]> {
    return request.get('/admin/banners')
  },

  async createBanner(data: Partial<Banner>): Promise<Banner> {
    return request.post('/admin/banners', data)
  },

  async updateBanner(id: number, data: Partial<Banner>): Promise<void> {
    return request.put(`/admin/banners/${id}`, data)
  },

  async deleteBanner(id: number): Promise<void> {
    return request.delete(`/admin/banners/${id}`)
  },

  async deleteBanners(ids: number[]): Promise<void> {
    return request.post('/admin/banners/batch-delete', { ids })
  },

  // Courses
  async listCourses(params: { keyword?: string; category?: string } & PageParams): Promise<PageData<Course>> {
    return request.get('/admin/courses', { params })
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    return request.post('/admin/courses', data)
  },

  async updateCourse(id: number, data: Partial<Course>): Promise<void> {
    return request.put(`/admin/courses/${id}`, data)
  },

  async deleteCourse(id: number): Promise<void> {
    return request.delete(`/admin/courses/${id}`)
  },
}
