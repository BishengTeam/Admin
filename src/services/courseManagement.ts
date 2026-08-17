import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type {
  CourseAsset,
  CourseAuditItem,
  CourseBindingImpact,
  CourseCategory,
  CourseChapter,
  CourseEntitlementJob,
  CourseEnrollment,
  CourseFilter,
  CourseItem,
  CourseMutation,
  CourseQuizBinding,
} from '@/types/course'

export interface CourseChapterMutation {
  title: string
  video_source_type: CourseChapter['video_source_type']
  video_url?: string | null
  video_storage_key?: string | null
  duration?: number | null
  sort_order?: number
  is_preview?: boolean
}

export const courseManagementService = {
  listCourses(params: CourseFilter, signal?: AbortSignal): Promise<PageData<CourseItem>> {
    return http.get('/admin/courses', { params, signal })
  },

  createCourse(data: CourseMutation): Promise<CourseItem> {
    return http.post('/admin/courses', data)
  },

  updateCourse(id: number, data: Partial<CourseMutation>): Promise<CourseItem> {
    return http.put(`/admin/courses/${id}`, data)
  },

  changeLifecycle(id: number, action: 'publish' | 'offline' | 'archive' | 'restore'): Promise<CourseItem> {
    return http.post(`/admin/courses/${id}/lifecycle`, { action })
  },

  deleteCourse(id: number): Promise<void> {
    return http.delete(`/admin/courses/${id}`)
  },

  listCategories(): Promise<CourseCategory[]> {
    return http.get('/admin/courses/categories')
  },

  createCategory(data: { name: string; sort_order?: number; is_active?: boolean }): Promise<CourseCategory> {
    return http.post('/admin/courses/categories', data)
  },

  updateCategory(id: number, data: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<CourseCategory> {
    return http.put(`/admin/courses/categories/${id}`, data)
  },

  listChapters(courseId: number, params?: { is_active?: boolean } & PageParams, signal?: AbortSignal): Promise<PageData<CourseChapter>> {
    return http.get(`/admin/courses/${courseId}/chapters`, { params, signal })
  },

  createChapter(courseId: number, data: CourseChapterMutation): Promise<CourseChapter> {
    return http.post(`/admin/courses/${courseId}/chapters`, data)
  },

  updateChapter(courseId: number, chapterId: number, data: Partial<CourseChapterMutation>): Promise<CourseChapter> {
    return http.put(`/admin/courses/${courseId}/chapters/${chapterId}`, data)
  },

  deleteChapter(courseId: number, chapterId: number): Promise<void> {
    return http.delete(`/admin/courses/${courseId}/chapters/${chapterId}`)
  },

  listAssets(courseId: number): Promise<CourseAsset[]> {
    return http.get(`/admin/courses/${courseId}/assets`)
  },

  uploadAsset(courseId: number, data: FormData): Promise<CourseAsset> {
    return http.post(`/admin/courses/${courseId}/assets`, data)
  },

  deleteAsset(courseId: number, assetId: number): Promise<void> {
    return http.delete(`/admin/courses/${courseId}/assets/${assetId}`)
  },

  listEnrollments(params: PageParams & { course_id?: number; user_id?: number; status?: string }, signal?: AbortSignal): Promise<PageData<CourseEnrollment>> {
    return http.get('/admin/courses/enrollments', { params, signal })
  },

  listBindings(courseId: number): Promise<CourseQuizBinding[]> {
    return http.get(`/admin/courses/${courseId}/quiz-bindings`)
  },

  previewBinding(courseId: number, libraryId: number): Promise<CourseBindingImpact> {
    return http.get(`/admin/courses/${courseId}/quiz-bindings/impact`, { params: { library_id: libraryId } })
  },

  createBinding(courseId: number, libraryId: number): Promise<CourseEntitlementJob> {
    return http.post(`/admin/courses/${courseId}/quiz-bindings`, {
      library_id: libraryId,
      backfill_confirmations: ['impact_confirmed'],
    })
  },

  setBindingStatus(bindingId: number, status: 'active' | 'inactive'): Promise<CourseEntitlementJob> {
    return http.post(`/admin/courses/course-quiz-bindings/${bindingId}/status`, { status })
  },

  listJobs(courseId: number, params: PageParams, signal?: AbortSignal): Promise<PageData<CourseEntitlementJob>> {
    return http.get(`/admin/courses/${courseId}/entitlement-jobs`, { params, signal })
  },

  retryJob(jobId: number): Promise<CourseEntitlementJob> {
    return http.post(`/admin/courses/course-entitlement-jobs/${jobId}/retry`)
  },

  listAuditLogs(params: PageParams & { course_id?: number; action?: string; result?: string }, signal?: AbortSignal): Promise<PageData<CourseAuditItem>> {
    return http.get('/admin/courses/audit-logs', { params, signal })
  },
}
