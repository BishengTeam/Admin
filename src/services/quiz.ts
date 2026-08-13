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
  SignedUrlSchema,
  StatsOverviewSchema,
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
  VersionRequest,
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
const ImportsPageSchema = pageSchema(ImportJobSchema)
const AuditPageSchema = pageSchema(AuditLogSchema)
const QuestionStatsPageSchema = pageSchema(QuestionStatsListItemSchema)
const QuizProbeCoreSchema = z.object({
  status: z.string(),
  checks: z.record(z.string(), z.string()),
  details: z.object({ quiz_tasks: QuizTaskSnapshotSchema }).passthrough(),
}).passthrough()

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

  async importCsv(file: File, metadata: CsvImportMetadata, signal?: AbortSignal): Promise<ImportJob> {
    const payload = requestParsed(CsvImportMetadataSchema, metadata)
    const body = new FormData()
    body.append('file', file)
    body.append('filename', payload.filename)
    body.append('size_bytes', String(payload.size_bytes))
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
