import { http } from '@/core/request'
import type { ContentItem, Course } from '@/types/content'
import type { PageData, PageParams } from '@/types/api'

export const contentService = {
  // Zones
  async list(params: { keyword?: string } & PageParams): Promise<PageData<ContentItem>> {
    return http.get<PageData<ContentItem>>('/admin/zones', { params })
  },

  async create(data: Partial<ContentItem>): Promise<ContentItem> {
    return http.post<ContentItem>('/admin/zones', data)
  },

  async update(id: number, data: Partial<ContentItem>): Promise<void> {
    return http.put<void>(`/admin/zones/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/zones/${id}`)
  },

  async deleteZones(ids: number[]): Promise<void> {
    return http.post<void>('/admin/zones/batch-delete', { ids })
  },

  async updateSort(updates: { id: number; sort_order: number }[]): Promise<void> {
    return http.put<void>('/admin/zones/sort', updates)
  },

  // Courses
  async listCourses(params: { keyword?: string; category?: string } & PageParams): Promise<PageData<Course>> {
    return http.get<PageData<Course>>('/admin/courses', { params })
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    return http.post<Course>('/admin/courses', data)
  },

  async updateCourse(id: number, data: Partial<Course>): Promise<void> {
    return http.put<void>(`/admin/courses/${id}`, data)
  },

  async deleteCourse(id: number): Promise<void> {
    return http.delete<void>(`/admin/courses/${id}`)
  },
}
