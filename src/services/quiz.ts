import type { AxiosRequestConfig } from 'axios'
import { http } from '@/core/request'
import { validateOrThrow, validateRequestOrThrow } from '@/core/validation'
import {
  AuditLogSchema,
  BatchResponseSchema,
  BatchRequestSchema,
  CategoryImpactQuerySchema,
  CategoryImpactSchema,
  CategorySchema,
  CategoryCreateSchema,
  CategoryStatusUpdateSchema,
  CategoryUpdateSchema,
  CsvImportMetadataSchema,
  DailyStatsSchema,
  QuizImageUploadCreateSchema,
  QuizImageUploadSchema,
  ImportCancelRequestSchema,
  ImportCategoryImpactSchema,
  ImportConfirmCategoriesRequestSchema,
  ImportErrorPageSchema,
  ImportJobSchema,
  JsonImportRequestSchema,
  QuestionSchema,
  QuestionCreateSchema,
  QuestionStatsSchema,
  QuestionStatsListItemSchema,
  QuestionUpdateSchema,
  QuizTaskSnapshotSchema,
  QuizContentStatusUpdateSchema,
  QuizContentTreeSchema,
  QuizCourseBindingSchema,
  QuizCourseOptionSchema,
  QuizKnowledgePointCreateSchema,
  QuizKnowledgePointSchema,
  QuizKnowledgePointUpdateSchema,
  QuizLibraryCreateSchema,
  QuizMigrationReportSchema,
  QuizLibrarySchema,
  QuizLibraryUpdateSchema,
  QuizModuleCreateSchema,
  QuizModuleSchema,
  QuizModuleUpdateSchema,
  QuizQuestionRevisionSchema,
  QuizV2QuestionCreateSchema,
  QuizV2QuestionSchema,
  QuizV2QuestionUpdateSchema,
  SignedUrlSchema,
  StatsOverviewSchema,
  UserStatsPageSchema,
  VersionRequestSchema,
} from '@/core/validation'
import type { PageData } from '@/types/api'
import type {
  AuditFilter,
  AuditLog,
  BatchRequest,
  BatchResponse,
  Category,
  CategoryCreate,
  CategoryImpact,
  CategoryImpactQuery,
  CategoryStatusUpdate,
  CategoryUpdate,
  CsvImportMetadata,
  DailyStatsItem,
  QuizImageUpload,
  ImportFilter,
  ImportCancelRequest,
  ImportCategoryImpact,
  ImportConfirmCategoriesRequest,
  ImportErrorFilter,
  ImportErrorPage,
  ImportJob,
  JsonImportRequest,
  Question,
  QuestionCreate,
  QuestionFilter,
  QuestionStats,
  QuestionStatsListItem,
  QuestionUpdate,
  QuizTaskProbe,
  SignedUrl,
  StatsOverview,
  StatsQuestionFilter,
  UserStatsListItem,
  VersionRequest,
  QuizContentTree,
  QuizCourseBinding,
  QuizCourseOption,
  QuizKnowledgePoint,
  QuizKnowledgePointCreate,
  QuizKnowledgePointUpdate,
  QuizLibrary,
  QuizLibraryCreate,
  QuizLibraryFilter,
  QuizLibraryLifecycleAction,
 QuizMigrationReport,
 QuizLibraryAccessMode,
 QuizAccessModeConvertResponse,
 QuizLibraryUpdate,
  QuizModule,
  QuizModuleCreate,
  QuizModuleUpdate,
  QuizQuestionRevision,
  QuizV2Question,
  QuizV2QuestionCreate,
  QuizV2QuestionFilter,
  QuizV2QuestionUpdate,
} from '@/types/quiz'
import { z } from 'zod'

const pageSchema = <T extends z.ZodType>(item: T) => z.object({
  items: z.array(item),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
}).strict()

const CategoriesSchema = z.array(CategorySchema)
const QuestionsPageSchema = pageSchema(QuestionSchema)
const QuizV2QuestionsPageSchema = pageSchema(QuizV2QuestionSchema)
const ImportsPageSchema = pageSchema(ImportJobSchema)
const AuditPageSchema = pageSchema(AuditLogSchema)
const QuestionStatsPageSchema = pageSchema(QuestionStatsListItemSchema)
const QuizProbeCoreSchema = z.object({
  status: z.string(),
  checks: z.record(z.string(), z.string()),
  details: z.object({ quiz_tasks: QuizTaskSnapshotSchema }).passthrough(),
}).passthrough()
const QuizLibrariesSchema = z.array(QuizLibrarySchema)
const QuizCourseBindingsSchema = z.array(QuizCourseBindingSchema)
const QuizCourseOptionsSchema = z.array(QuizCourseOptionSchema)
const QuizQuestionRevisionsSchema = z.array(QuizQuestionRevisionSchema)

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  return validateOrThrow(schema, value)
}

function requestParsed<T>(schema: z.ZodType<T>, value: unknown): T {
  return validateRequestOrThrow(schema, value)
}

function omitUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => omitUndefined(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as object).filter(([, item]) => item !== undefined).map(([key, item]) => [key, omitUndefined(item)])) as T
  }
  return value
}

function queryConfig(params: object, signal?: AbortSignal): AxiosRequestConfig {
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
  return { params: clean, signal }
}

function probeUrl(endpoint: 'health' | 'ready') {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  return `${base}/${endpoint}`
}

export const quizService = {
  async listLibraries(params: QuizLibraryFilter = {}, signal?: AbortSignal): Promise<QuizLibrary[]> {
    return parsed(QuizLibrariesSchema, await http.get('/admin/quiz/libraries', queryConfig(params, signal)))
  },

  async getLibrary(id: number, signal?: AbortSignal): Promise<QuizLibrary> {
    return parsed(QuizLibrarySchema, await http.get(`/admin/quiz/libraries/${id}`, { signal }))
  },

 async getMigrationReport(signal?: AbortSignal): Promise<QuizMigrationReport> {
   return parsed(QuizMigrationReportSchema, await http.get('/admin/quiz/migration-report', { signal }))
 },

  async convertAccessMode(libraryId: number, lockVersion: number, targetMode: QuizLibraryAccessMode, reauthToken: string, signal?: AbortSignal): Promise<QuizAccessModeConvertResponse> {
    return http.post(
      `/admin/quiz/libraries/${libraryId}/convert-access-mode`,
      { lock_version: lockVersion, target_mode: targetMode },
      { headers: { 'X-Reauth-Token': reauthToken }, signal },
    )
  },

  async createLibrary(data: QuizLibraryCreate, signal?: AbortSignal): Promise<QuizLibrary> {
    return parsed(QuizLibrarySchema, await http.post('/admin/quiz/libraries', requestParsed(QuizLibraryCreateSchema, omitUndefined(data)), { signal }))
  },

  async updateLibrary(id: number, data: QuizLibraryUpdate, signal?: AbortSignal): Promise<QuizLibrary> {
    return parsed(QuizLibrarySchema, await http.put(`/admin/quiz/libraries/${id}`, requestParsed(QuizLibraryUpdateSchema, omitUndefined(data)), { signal }))
  },

  async transitionLibrary(id: number, action: QuizLibraryLifecycleAction, lock_version: number, signal?: AbortSignal): Promise<QuizLibrary> {
    return parsed(QuizLibrarySchema, await http.post(`/admin/quiz/libraries/${id}/lifecycle`, { action, lock_version }, { signal }))
  },

  async listCourseBindings(libraryId: number, signal?: AbortSignal): Promise<QuizCourseBinding[]> {
    return parsed(QuizCourseBindingsSchema, await http.get(`/admin/quiz/libraries/${libraryId}/course-bindings`, { signal }))
  },

  async listCourseOptions(keyword?: string, signal?: AbortSignal): Promise<QuizCourseOption[]> {
    return parsed(
      QuizCourseOptionsSchema,
      await http.get('/admin/quiz/course-options', queryConfig({ keyword, limit: 100 }, signal)),
    )
  },

  async createCourseBinding(libraryId: number, course_id: number, signal?: AbortSignal): Promise<QuizCourseBinding> {
    return parsed(QuizCourseBindingSchema, await http.post(`/admin/quiz/libraries/${libraryId}/course-bindings`, { course_id }, { signal }))
  },

  async updateCourseBindingStatus(id: number, status: QuizCourseBinding['status'], lock_version: number, signal?: AbortSignal): Promise<QuizCourseBinding> {
    return parsed(QuizCourseBindingSchema, await http.post(`/admin/quiz/course-bindings/${id}/status`, { status, lock_version }, { signal }))
  },

  async getContentTree(libraryId: number, signal?: AbortSignal): Promise<QuizContentTree> {
    return parsed(QuizContentTreeSchema, await http.get(`/admin/quiz/libraries/${libraryId}/content-tree`, { signal }))
  },

  async createModule(data: QuizModuleCreate, signal?: AbortSignal): Promise<QuizModule> {
    return parsed(QuizModuleSchema, await http.post('/admin/quiz/modules', requestParsed(QuizModuleCreateSchema, omitUndefined(data)), { signal }))
  },

  async updateModule(id: number, data: QuizModuleUpdate, signal?: AbortSignal): Promise<QuizModule> {
    return parsed(QuizModuleSchema, await http.put(`/admin/quiz/modules/${id}`, requestParsed(QuizModuleUpdateSchema, omitUndefined(data)), { signal }))
  },

  async updateModuleStatus(id: number, status: 'active' | 'disabled', lock_version: number, signal?: AbortSignal): Promise<QuizModule> {
    const payload = requestParsed(QuizContentStatusUpdateSchema, { status, lock_version })
    return parsed(QuizModuleSchema, await http.post(`/admin/quiz/modules/${id}/status`, payload, { signal }))
  },

  async deleteModule(id: number, lock_version: number, signal?: AbortSignal): Promise<null> {
    await http.delete(`/admin/quiz/modules/${id}`, { data: requestParsed(VersionRequestSchema, { lock_version }), signal })
    return null
  },

  async undoDeleteModule(id: number, lock_version: number, signal?: AbortSignal): Promise<QuizModule> {
    return parsed(QuizModuleSchema, await http.post(`/admin/quiz/modules/${id}/undo-delete`, { lock_version }, { signal }))
  },

  async createKnowledgePoint(data: QuizKnowledgePointCreate, signal?: AbortSignal): Promise<QuizKnowledgePoint> {
    return parsed(QuizKnowledgePointSchema, await http.post('/admin/quiz/knowledge-points', requestParsed(QuizKnowledgePointCreateSchema, omitUndefined(data)), { signal }))
  },

  async updateKnowledgePoint(id: number, data: QuizKnowledgePointUpdate, signal?: AbortSignal): Promise<QuizKnowledgePoint> {
    return parsed(QuizKnowledgePointSchema, await http.put(`/admin/quiz/knowledge-points/${id}`, requestParsed(QuizKnowledgePointUpdateSchema, omitUndefined(data)), { signal }))
  },

  async updateKnowledgePointStatus(id: number, status: 'active' | 'disabled', lock_version: number, signal?: AbortSignal): Promise<QuizKnowledgePoint> {
    const payload = requestParsed(QuizContentStatusUpdateSchema, { status, lock_version })
    return parsed(QuizKnowledgePointSchema, await http.post(`/admin/quiz/knowledge-points/${id}/status`, payload, { signal }))
  },

  async deleteKnowledgePoint(id: number, lock_version: number, signal?: AbortSignal): Promise<null> {
    await http.delete(`/admin/quiz/knowledge-points/${id}`, { data: requestParsed(VersionRequestSchema, { lock_version }), signal })
    return null
  },

  async undoDeleteKnowledgePoint(id: number, lock_version: number, signal?: AbortSignal): Promise<QuizKnowledgePoint> {
    return parsed(QuizKnowledgePointSchema, await http.post(`/admin/quiz/knowledge-points/${id}/undo-delete`, { lock_version }, { signal }))
  },

  async listV2Questions(params: QuizV2QuestionFilter, signal?: AbortSignal): Promise<PageData<QuizV2Question>> {
    return parsed(QuizV2QuestionsPageSchema, await http.get('/admin/quiz/questions', queryConfig(params, signal))) as PageData<QuizV2Question>
  },

  async createV2Question(data: QuizV2QuestionCreate, signal?: AbortSignal): Promise<QuizV2Question> {
    return parsed(QuizV2QuestionSchema, await http.post('/admin/quiz/questions', requestParsed(QuizV2QuestionCreateSchema, omitUndefined(data)), { signal }))
  },

  async updateV2Question(id: number, data: QuizV2QuestionUpdate, signal?: AbortSignal): Promise<QuizV2Question> {
    return parsed(QuizV2QuestionSchema, await http.put(`/admin/quiz/questions/${id}`, requestParsed(QuizV2QuestionUpdateSchema, omitUndefined(data)), { signal }))
  },

  async listQuestionRevisions(id: number, signal?: AbortSignal): Promise<QuizQuestionRevision[]> {
    return parsed(QuizQuestionRevisionsSchema, await http.get(`/admin/quiz/questions/${id}/revisions`, { signal }))
  },

  async undoDeleteQuestion(id: number, lock_version: number, signal?: AbortSignal): Promise<QuizV2Question> {
    return parsed(QuizV2QuestionSchema, await http.post(`/admin/quiz/questions/${id}/undo-delete`, { lock_version }, { signal }))
  },

  async publishV2Question(id: number, lock_version: number, signal?: AbortSignal): Promise<QuizV2Question> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    return parsed(QuizV2QuestionSchema, await http.post(`/admin/quiz/questions/${id}/publish`, payload, { signal }))
  },

  async disableV2Question(id: number, lock_version: number, signal?: AbortSignal): Promise<QuizV2Question> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    return parsed(QuizV2QuestionSchema, await http.post(`/admin/quiz/questions/${id}/disable`, payload, { signal }))
  },

  async restoreV2Question(id: number, lock_version: number, signal?: AbortSignal): Promise<QuizV2Question> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    return parsed(QuizV2QuestionSchema, await http.post(`/admin/quiz/questions/${id}/restore`, payload, { signal }))
  },
  async listCategories(params: { status?: Category['status']; parent_id?: number } = {}, signal?: AbortSignal): Promise<Category[]> {
    return parsed(CategoriesSchema, await http.get('/admin/quiz/categories', queryConfig(params, signal)))
  },

  async createCategory(data: CategoryCreate, signal?: AbortSignal): Promise<Category> {
    const payload = requestParsed(CategoryCreateSchema, omitUndefined(data))
    return parsed(CategorySchema, await http.post('/admin/quiz/categories', payload, { signal }))
  },

  async updateCategory(id: number, data: CategoryUpdate, signal?: AbortSignal): Promise<Category> {
    const payload = requestParsed(CategoryUpdateSchema, omitUndefined(data))
    return parsed(CategorySchema, await http.put(`/admin/quiz/categories/${id}`, payload, { signal }))
  },

  async deleteCategory(id: number, lock_version: number, signal?: AbortSignal): Promise<null> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    await http.delete(`/admin/quiz/categories/${id}`, { data: payload, signal })
    return null
  },

  async updateCategoryStatus(id: number, data: CategoryStatusUpdate, signal?: AbortSignal): Promise<Category> {
    const payload = requestParsed(CategoryStatusUpdateSchema, omitUndefined(data))
    return parsed(CategorySchema, await http.post(`/admin/quiz/categories/${id}/status`, payload, { signal }))
  },

  async previewCategoryImpact(id: number, data: CategoryImpactQuery, signal?: AbortSignal): Promise<CategoryImpact> {
    const query = requestParsed(CategoryImpactQuerySchema, omitUndefined(data))
    return parsed(CategoryImpactSchema, await http.get(`/admin/quiz/categories/${id}/impact`, queryConfig(query, signal)))
  },

  async listQuestions(params: QuestionFilter, signal?: AbortSignal): Promise<PageData<Question>> {
    return parsed(QuestionsPageSchema, await http.get('/admin/quiz/questions', queryConfig(params, signal)))
  },

  async createQuestion(data: QuestionCreate, signal?: AbortSignal): Promise<Question> {
    const payload = requestParsed(QuestionCreateSchema, omitUndefined(data))
    return parsed(QuestionSchema, await http.post('/admin/quiz/questions', payload, { signal }))
  },

  async updateQuestion(id: number, data: QuestionUpdate, signal?: AbortSignal): Promise<Question> {
    const payload = requestParsed(QuestionUpdateSchema, omitUndefined(data))
    return parsed(QuestionSchema, await http.put(`/admin/quiz/questions/${id}`, payload, { signal }))
  },

  async deleteQuestion(id: number, lock_version: number, signal?: AbortSignal): Promise<null> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    await http.delete(`/admin/quiz/questions/${id}`, { data: payload, signal })
    return null
  },

  async publishQuestion(id: number, lock_version: number, signal?: AbortSignal): Promise<Question> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    return parsed(QuestionSchema, await http.post(`/admin/quiz/questions/${id}/publish`, payload, { signal }))
  },

  async disableQuestion(id: number, lock_version: number, signal?: AbortSignal): Promise<Question> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    return parsed(QuestionSchema, await http.post(`/admin/quiz/questions/${id}/disable`, payload, { signal }))
  },

  async restoreQuestion(id: number, lock_version: number, signal?: AbortSignal): Promise<Question> {
    const payload = requestParsed(VersionRequestSchema, { lock_version } satisfies VersionRequest)
    return parsed(QuestionSchema, await http.post(`/admin/quiz/questions/${id}/restore`, payload, { signal }))
  },

  async batchPublish(data: BatchRequest, signal?: AbortSignal): Promise<BatchResponse> {
    const payload = requestParsed(BatchRequestSchema, omitUndefined(data))
    return parsed(BatchResponseSchema, await http.post('/admin/quiz/questions/batch-publish', payload, { signal }))
  },

  async batchDisable(data: BatchRequest, signal?: AbortSignal): Promise<BatchResponse> {
    const payload = requestParsed(BatchRequestSchema, omitUndefined(data))
    return parsed(BatchResponseSchema, await http.post('/admin/quiz/questions/batch-disable', payload, { signal }))
  },

  async getQuestionStats(id: number, signal?: AbortSignal): Promise<QuestionStats> {
    return parsed(QuestionStatsSchema, await http.get(`/admin/quiz/questions/${id}/stats`, { signal }))
  },

  async importCsv(file: File, metadata: CsvImportMetadata, libraryId?: number, signal?: AbortSignal): Promise<ImportJob> {
    const payload = requestParsed(CsvImportMetadataSchema, metadata)
    const body = new FormData()
    body.append('file', file)
    body.append('filename', payload.filename)
    body.append('size_bytes', String(payload.size_bytes))
    if (libraryId != null) body.append('library_id', String(libraryId))
    return parsed(ImportJobSchema, await http.post('/admin/quiz/imports/csv', body, { signal }))
  },

  async importJson(data: JsonImportRequest, signal?: AbortSignal): Promise<ImportJob> {
    const payload = requestParsed(JsonImportRequestSchema, omitUndefined(data))
    return parsed(ImportJobSchema, await http.post('/admin/quiz/imports/json', payload, { signal }))
  },

  async listImports(params: ImportFilter = {}, signal?: AbortSignal): Promise<PageData<ImportJob>> {
    return parsed(ImportsPageSchema, await http.get('/admin/quiz/imports', queryConfig(params, signal)))
  },

  async getImport(id: number, signal?: AbortSignal): Promise<ImportJob> {
    return parsed(ImportJobSchema, await http.get(`/admin/quiz/imports/${id}`, { signal }))
  },

  async listImportErrors(id: number, params: ImportErrorFilter = {}, signal?: AbortSignal): Promise<ImportErrorPage> {
    return parsed(ImportErrorPageSchema, await http.get(`/admin/quiz/imports/${id}/errors`, queryConfig(params, signal)))
  },

  async getImportCategoryImpact(id: number, signal?: AbortSignal): Promise<ImportCategoryImpact> {
    return parsed(ImportCategoryImpactSchema, await http.get(`/admin/quiz/imports/${id}/category-impact`, { signal }))
  },

  async confirmImportCategories(id: number, data: ImportConfirmCategoriesRequest, signal?: AbortSignal): Promise<ImportJob> {
    const payload = requestParsed(ImportConfirmCategoriesRequestSchema, data)
    return parsed(ImportJobSchema, await http.post(`/admin/quiz/imports/${id}/confirm-categories`, payload, { signal }))
  },

  async cancelImport(id: number, data: ImportCancelRequest, signal?: AbortSignal): Promise<ImportJob> {
    const payload = requestParsed(ImportCancelRequestSchema, data)
    return parsed(ImportJobSchema, await http.post(`/admin/quiz/imports/${id}/cancel`, payload, { signal }))
  },

  async getImportReportUrl(id: number, signal?: AbortSignal): Promise<SignedUrl> {
    return parsed(SignedUrlSchema, await http.get(`/admin/quiz/imports/${id}/report-url`, { signal }))
  },

  async getImportSourceUrl(id: number, signal?: AbortSignal): Promise<SignedUrl> {
    return parsed(SignedUrlSchema, await http.get(`/admin/quiz/imports/${id}/source-url`, { signal }))
  },

  async retryImport(id: number, signal?: AbortSignal): Promise<ImportJob> {
    return parsed(ImportJobSchema, await http.post(`/admin/quiz/imports/${id}/retry`, undefined, { signal }))
  },

  async getStatsOverview(signal?: AbortSignal): Promise<StatsOverview> {
    return parsed(StatsOverviewSchema, await http.get('/admin/quiz/stats/overview', { signal }))
  },

  async listQuestionStats(params: StatsQuestionFilter = {}, signal?: AbortSignal): Promise<PageData<QuestionStatsListItem>> {
    return parsed(QuestionStatsPageSchema, await http.get('/admin/quiz/stats/questions', queryConfig(params, signal)))
  },

  async getDailyStats(days: 7 | 30 | 90 = 30, signal?: AbortSignal): Promise<DailyStatsItem[]> {
    return parsed(DailyStatsSchema, await http.get('/admin/quiz/stats/daily', queryConfig({ days }, signal)))
  },

  async listUserStats(params: { page?: number; page_size?: number } = {}, signal?: AbortSignal): Promise<PageData<UserStatsListItem>> {
    return parsed(UserStatsPageSchema, await http.get('/admin/quiz/stats/users', queryConfig(params, signal)))
  },

  async createImageUpload(input: { filename: string; content_type: string; size_bytes: number }, signal?: AbortSignal): Promise<QuizImageUpload> {
    return parsed(
      QuizImageUploadSchema,
      await http.post('/admin/quiz/uploads', requestParsed(QuizImageUploadCreateSchema, input), { signal }),
    )
  },

  async listAuditLogs(params: AuditFilter = {}, signal?: AbortSignal): Promise<PageData<AuditLog>> {
    return parsed(AuditPageSchema, await http.get('/admin/quiz/audit-logs', queryConfig(params, signal)))
  },

  async getTaskProbe(endpoint: 'health' | 'ready', signal?: AbortSignal): Promise<QuizTaskProbe> {
    const response = await fetch(probeUrl(endpoint), {
      headers: { Accept: 'application/json' },
      signal,
    })
    let envelope: unknown
    try {
      envelope = await response.json()
    } catch {
      throw new Error(`${endpoint === 'health' ? '健康' : '就绪'}检查返回了无效 JSON`)
    }
    if (!envelope || typeof envelope !== 'object') throw new Error('任务监控响应格式错误')
    const raw = envelope as { code?: unknown; data?: unknown }
    const core = parsed(QuizProbeCoreSchema, raw.data ?? envelope)
    return {
      endpoint,
      http_status: response.status,
      code: typeof raw.code === 'number' ? raw.code : response.ok ? 0 : 50000,
      status: core.status,
      checks: core.checks,
      quiz_tasks: core.details.quiz_tasks,
    }
  },
}

export type QuizService = typeof quizService
