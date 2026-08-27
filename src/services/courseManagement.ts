import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type {
  CourseAuditItem,
  CourseBindingImpact,
  CourseCategory,
  CourseChapter,
  CourseEnrollment,
  CourseEntitlementJob,
  CourseItem,
  CourseQuizBinding,
  CourseUpload,
} from '@/types/course'
import { quizService } from '@/services/quiz'

export interface CourseFilter extends PageParams {
  keyword?: string
  category?: string
  status?: CourseItem['status']
  price_type?: 'free' | 'paid'
  bound_quiz?: boolean
}

export interface CourseMutation {
  title: string
  category: string
  description?: string
  price_yuan: string
  preview_chapter_count: number
  teacher_name?: string
  teacher_contact?: string
}

export interface CourseUploadStart {
  kind: 'cover' | 'chapter_video'
  filename: string
  content_type: string
  size_bytes: number
  course_id?: number
  title?: string
  duration?: number
  sort_order?: number
}

export async function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Math.max(1, Math.round(video.duration))
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取视频时长，请在列表中手动填写'))
    }
    video.src = url
  })
}

async function cropCoverTo16By9(file: File): Promise<File> {
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = objectUrl
    })
    const targetRatio = 16 / 9
    const sourceRatio = image.width / image.height
    let sx = 0
    let sy = 0
    let width = image.width
    let height = image.height
    if (sourceRatio > targetRatio) {
      width = Math.round(image.height * targetRatio)
      sx = Math.round((image.width - width) / 2)
    } else {
      height = Math.round(image.width / targetRatio)
      sy = Math.round((image.height - height) / 2)
    }
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(image, sx, sy, width, height, 0, 0, 1280, 720)
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92),
    )
    if (!blob) return file
    const extension = file.type === 'image/png' ? '.png' : '.jpg'
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-16x9${extension}`, {
      type: blob.type,
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function uploadMultipart(
  start: CourseUploadStart,
  file: File,
  existing?: CourseUpload,
): Promise<CourseUpload> {
  let upload = existing
  let uploadedPartNumbers = new Set<number>()
  if (!upload) {
    upload = await courseManagementService.createUpload(start)
  } else {
    const detail = await courseManagementService.getUpload(upload.id)
    upload = detail
    uploadedPartNumbers = new Set(detail.parts.map(part => part.part_number))
  }
  if (upload.upload_url) {
    const response = await fetch(upload.upload_url, { method: 'PUT', body: file })
    if (!response.ok) throw new Error('封面上传失败')
    const completed = await courseManagementService.completeUpload(upload.id)
    return completed.upload
  }
  const partCount = Math.ceil(file.size / upload.part_size)
  for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
    if (uploadedPartNumbers.has(partNumber)) continue
    const part = await courseManagementService.createUploadPartUrl(upload.id, partNumber)
    const startByte = (partNumber - 1) * upload.part_size
    const body = file.slice(startByte, Math.min(file.size, startByte + upload.part_size))
    const response = await fetch(part.url, { method: 'PUT', body })
    if (!response.ok) throw new Error(`分片 ${partNumber} 上传失败`)
  }
  const completed = await courseManagementService.completeUpload(upload.id)
  return completed.upload
}

export const courseManagementService = {
  listCourses(params: CourseFilter, signal?: AbortSignal): Promise<PageData<CourseItem>> {
    return http.get('/admin/courses', { params, signal })
  },

  getCourse(id: number): Promise<CourseItem> {
    return http.get(`/admin/courses/${id}`)
  },

  createCourse(data: CourseMutation & { cover_upload_id: number }): Promise<CourseItem> {
    return http.post('/admin/courses', data)
  },

  updateCourse(
    id: number,
    data: Partial<Omit<CourseMutation, 'price_yuan'>> & { cover_upload_id?: number },
  ): Promise<CourseItem> {
    return http.put(`/admin/courses/${id}`, data)
  },

  updatePrice(id: number, priceYuan: string): Promise<CourseItem> {
    return http.put(`/admin/courses/${id}/price`, { price_yuan: priceYuan })
  },

  changeLifecycle(
    id: number,
    action: 'publish' | 'offline' | 'archive' | 'restore',
  ): Promise<CourseItem> {
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

  updateCategory(
    id: number,
    data: Partial<{ name: string; sort_order: number; is_active: boolean }>,
  ): Promise<CourseCategory> {
    return http.put(`/admin/courses/categories/${id}`, data)
  },

  listChapters(
    courseId: number,
    params?: PageParams,
    signal?: AbortSignal,
  ): Promise<PageData<CourseChapter>> {
    return http.get(`/admin/courses/${courseId}/chapters`, { params, signal })
  },

  batchCreateChapters(courseId: number, uploadIds: number[]): Promise<CourseChapter[]> {
    return http.post(`/admin/courses/${courseId}/chapters/batch`, { upload_ids: uploadIds })
  },

  updateChapter(
    courseId: number,
    chapterId: number,
    data: Partial<Pick<CourseChapter, 'title' | 'duration' | 'sort_order'>>,
  ): Promise<CourseChapter> {
    return http.put(`/admin/courses/${courseId}/chapters/${chapterId}`, data)
  },

  replaceChapterVideo(courseId: number, chapterId: number, uploadId: number): Promise<CourseChapter> {
    return http.post(`/admin/courses/${courseId}/chapters/${chapterId}/video`, {
      upload_id: uploadId,
    })
  },

  deleteChapter(courseId: number, chapterId: number): Promise<void> {
    return http.delete(`/admin/courses/${courseId}/chapters/${chapterId}`)
  },

  listUploads(courseId: number): Promise<CourseUpload[]> {
    return http.get('/admin/course-uploads', { params: { course_id: courseId } })
  },

  getUpload(uploadId: number): Promise<CourseUpload> {
    return http.get(`/admin/course-uploads/${uploadId}`)
  },

  createUpload(data: CourseUploadStart): Promise<CourseUpload> {
    return http.post('/admin/course-uploads', data)
  },

  createUploadPartUrl(uploadId: number, partNumber: number): Promise<{ url: string; expires_at: number }> {
    return http.post(`/admin/course-uploads/${uploadId}/parts`, { part_number: partNumber })
  },

  completeUpload(uploadId: number): Promise<{ upload: CourseUpload; object_key: string }> {
    return http.post(`/admin/course-uploads/${uploadId}/complete`)
  },

  abortUpload(uploadId: number): Promise<void> {
    return http.post(`/admin/course-uploads/${uploadId}/abort`)
  },

  async uploadCover(file: File): Promise<CourseUpload> {
    if (file.size > 10 * 1024 * 1024) throw new Error('封面不能超过 10MB')
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('封面仅支持 JPG、PNG、WebP')
    const cropped = await cropCoverTo16By9(file)
    return uploadMultipart(
      {
        kind: 'cover',
        filename: cropped.name,
        content_type: cropped.type,
        size_bytes: cropped.size,
      },
      cropped,
    )
  },

 async uploadChapterVideo(
   courseId: number,
   file: File,
   sortOrder: number,
    overrides?: { title?: string; duration?: number; onProgress?: (percent: number) => void },
   existing?: CourseUpload,
 ): Promise<CourseUpload> {
    if (file.size > 5 * 1024 * 1024 * 1024) throw new Error('章节视频不能超过 5GB')
    if (!/\.(mp4|mov|mkv)$/i.test(file.name)) throw new Error('章节视频仅支持 MP4、MOV、MKV')
    const duration = overrides?.duration ?? await readVideoDuration(file)
    return uploadMultipart(
      {
        kind: 'chapter_video',
        course_id: courseId,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        title: overrides?.title ?? file.name.replace(/\.[^.]+$/, ''),
        duration,
        sort_order: sortOrder,
      },
      file,
      existing,
    )
  },

  async resumeChapterVideo(upload: CourseUpload, file: File): Promise<CourseUpload> {
    if (file.name !== upload.filename || file.size !== upload.size_bytes) {
      throw new Error('请选择与原上传任务相同的视频文件')
    }
    return this.uploadChapterVideo(
      upload.course_id ?? 0,
      file,
      upload.sort_order ?? 1,
      { title: upload.title ?? undefined, duration: upload.duration ?? undefined },
      upload,
    )
  },

  listEnrollments(
    params: PageParams & { course_id?: number; user_id?: number; status?: string },
    signal?: AbortSignal,
  ): Promise<PageData<CourseEnrollment>> {
    return http.get('/admin/courses/enrollments', { params, signal })
  },

  listBindings(courseId: number): Promise<CourseQuizBinding[]> {
    return http.get(`/admin/courses/${courseId}/quiz-bindings`)
  },

  previewBinding(courseId: number, libraryId: number): Promise<CourseBindingImpact> {
    return http.get(`/admin/courses/${courseId}/quiz-bindings/impact`, {
      params: { library_id: libraryId },
    })
  },

  createBinding(courseId: number, libraryId: number): Promise<CourseEntitlementJob> {
    return http.post(`/admin/courses/${courseId}/quiz-bindings`, {
      library_id: libraryId,
      backfill_confirmations: ['impact_confirmed'],
    })
  },

  setBindingStatus(
    bindingId: number,
    status: 'active' | 'inactive',
  ): Promise<CourseEntitlementJob> {
    return http.post(`/admin/courses/course-quiz-bindings/${bindingId}/status`, { status })
  },

  listJobs(courseId: number, params: PageParams, signal?: AbortSignal): Promise<PageData<CourseEntitlementJob>> {
    return http.get(`/admin/courses/${courseId}/entitlement-jobs`, { params, signal })
  },

  retryJob(jobId: number): Promise<CourseEntitlementJob> {
    return http.post(`/admin/courses/course-entitlement-jobs/${jobId}/retry`)
  },

  listAuditLogs(
    params: PageParams & { course_id?: number; action?: string; result?: string },
    signal?: AbortSignal,
  ): Promise<PageData<CourseAuditItem>> {
    return http.get('/admin/courses/audit-logs', { params, signal })
  },

  listBindableLibraries(signal?: AbortSignal) {
    return quizService.listLibraries({
      access_mode: 'course_entitlement',
      status: 'published',
    }, signal)
  },
}
