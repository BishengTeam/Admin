// Zod 运行时校验 — 代码准备
// 逐步覆盖关键 API 响应，后端字段变更时运行时报错而非静默失败
import { z } from 'zod'
import type { ImportCategoryImpactNode } from '@/types/quiz'

const nullableString = z.string().nullable()
const dateString = z.string().min(1)
const positiveInt = z.number().int().min(1)
const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
type JsonValueSchema = string | number | boolean | null | JsonValueSchema[] | { [key: string]: JsonValueSchema }
const jsonValueSchema: z.ZodType<JsonValueSchema> = z.lazy(() => z.union([
  jsonPrimitiveSchema,
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]))

export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  normalized_name: z.string(),
  parent_id: z.number().nullable(),
  depth: z.number().min(1).max(3),
  description: nullableString,
  status: z.enum(['active', 'disabled']),
  sort_order: z.number(),
  ever_had_question: z.boolean(),
  lock_version: z.number().min(1),
  created_by: z.number(),
  updated_by: z.number(),
  created_at: dateString,
  updated_at: dateString,
}).strict()

const answerKeySchema = z.enum(['A', 'B', 'C', 'D'])
const questionTypeSchema = z.enum(['single_choice', 'multiple_choice', 'judge', 'essay'])
const referenceAnswerSchema = z.string().max(5000).nullable()
const answerSchema = z.union([
  answerKeySchema,
  z.array(answerKeySchema).min(1).max(4).refine((value) => new Set(value).size === value.length, { message: '答案不能重复' }),
])
const optionSchema = z.record(z.string(), z.string()).superRefine((value, ctx) => {
  const keys = Object.keys(value)
  if (keys.length > 4 || keys.some((key) => !['A', 'B', 'C', 'D'].includes(key))) {
    ctx.addIssue({ code: 'custom', message: '选项键只能为 A-D，最多 4 个' })
  }
  const expected = ['A', 'B', 'C', 'D'].slice(0, keys.length)
  if (keys.some((key, index) => key !== expected[index])) {
    ctx.addIssue({ code: 'custom', message: '选项键必须从 A 开始连续排列' })
  }
  // Option text may be empty when the option carries an image; the backend
  // enforces the text-or-image minimum at save time.
})
const imageUrlSchema = z.array(z.string().trim().url().max(1024)).max(9)
const imageUrlsResponseSchema = imageUrlSchema.default([])
const optionImageUrlsSchema = z.record(z.string().regex(/^[A-D]$/, '选项键只能为 A-D'), z.string().trim().url().max(1024))
const optionImageUrlsResponseSchema = optionImageUrlsSchema.default({})

function questionShapeRules(value: {
  question_type?: 'single_choice' | 'multiple_choice' | 'judge' | 'essay'
  options?: Record<string, string> | null
  correct_answer?: string | string[] | null
  reference_answer?: string | null
}, ctx: z.RefinementCtx) {
  if (value.question_type === 'essay') {
    if (value.options && Object.keys(value.options).length > 0) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: '问答题不支持选项' })
    }
    if (value.correct_answer !== undefined && value.correct_answer !== null) {
      ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: '问答题不能配置唯一标准答案' })
    }
  }
  if (value.question_type !== 'essay' && value.reference_answer != null) {
    ctx.addIssue({ code: 'custom', path: ['reference_answer'], message: '仅问答题支持参考答案或评分标准' })
  }
  if (value.question_type === 'multiple_choice' && typeof value.correct_answer === 'string') {
    ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: '多选题答案必须使用数组' })
  }
  // `question_type` is optional on partial update requests.  When it is
  // omitted, leave the answer shape check to the server, which can apply the
  // existing question's type; otherwise a multiple-choice answer-only edit
  // would be rejected as if it were a single-choice question.
  if (value.question_type && value.question_type !== 'multiple_choice' && Array.isArray(value.correct_answer)) {
    ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: '单选题和判断题答案必须使用单个选项键' })
  }
  if (value.question_type === 'judge' && value.options && (value.options.A !== '正确' || value.options.B !== '错误' || Object.keys(value.options).length !== 2)) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: '判断题固定为 A=正确、B=错误' })
  }
  if (value.question_type === 'judge' && typeof value.correct_answer === 'string' && !['A', 'B'].includes(value.correct_answer)) {
    ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: '判断题答案只能为 A 或 B' })
  }
  if (value.options && value.correct_answer) {
    const optionKeys = new Set(Object.keys(value.options))
    const answers = Array.isArray(value.correct_answer) ? value.correct_answer : [value.correct_answer]
    if (answers.some((answer) => !optionKeys.has(answer))) {
      ctx.addIssue({ code: 'custom', path: ['correct_answer'], message: '正确答案必须对应已有选项' })
    }
  }
}

export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(128),
  parent_id: positiveInt.nullable().optional(),
  description: z.string().max(256).nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict()

export const CategoryUpdateSchema = z.object({
  lock_version: positiveInt,
  name: z.string().min(1).max(128).optional(),
  parent_id: positiveInt.nullable().optional(),
  description: z.string().max(256).nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'lock_version'), { message: '至少需要一个分类变更字段' })

export const CategoryStatusUpdateSchema = z.object({
  status: z.enum(['active', 'disabled']),
  lock_version: positiveInt,
}).strict()

export const CategoryImpactQuerySchema = z.object({
  action: z.enum(['disable', 'move', 'delete']),
  target_parent_id: positiveInt.nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action !== 'move' && value.target_parent_id !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['target_parent_id'], message: '仅移动预览允许目标父分类' })
  }
})

export const CategoryImpactSchema = z.object({
  category_id: positiveInt,
  action: z.enum(['disable', 'move', 'delete']),
  target_parent_id: positiveInt.nullable(),
  descendant_category_count: z.number().int().min(0),
  draft_question_count: z.number().int().min(0),
  published_question_count: z.number().int().min(0),
  disabled_question_count: z.number().int().min(0),
  affected_new_pool_question_count: z.number().int().min(0),
  history_snapshot_affected: z.literal(false),
  can_execute: z.boolean(),
  blocking_reasons: z.array(z.string()),
  calculated_at: dateString,
}).strict()

export const QuestionCreateSchema = z.object({
  category_id: positiveInt,
  question_type: questionTypeSchema,
  question_text: z.string().min(1).max(1024),
  options: optionSchema.nullable().optional(),
  correct_answer: answerSchema.nullable().optional(),
  explanation: z.string().max(1024).nullable().optional(),
  image_urls: imageUrlSchema.optional(),
  option_image_urls: optionImageUrlsSchema.optional(),
}).strict().superRefine(questionShapeRules)

export const QuestionUpdateSchema = z.object({
  lock_version: positiveInt,
  category_id: positiveInt.optional(),
  question_type: questionTypeSchema.optional(),
  question_text: z.string().min(1).max(1024).optional(),
  options: optionSchema.nullable().optional(),
  correct_answer: answerSchema.nullable().optional(),
  explanation: z.string().max(1024).nullable().optional(),
  image_urls: imageUrlSchema.optional(),
  option_image_urls: optionImageUrlsSchema.optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'lock_version'), { message: '至少需要一个题目变更字段' }).superRefine(questionShapeRules)

export const VersionRequestSchema = z.object({ lock_version: positiveInt }).strict()

export const BatchRequestSchema = z.object({
  items: z.array(z.object({ question_id: positiveInt, lock_version: positiveInt }).strict()).min(1).max(100),
}).strict().refine((value) => new Set(value.items.map((item) => item.question_id)).size === value.items.length, { message: 'question_id 不能重复' })

export const CsvImportMetadataSchema = z.object({ filename: z.string().min(1).max(255).regex(/\.csv$/i, '文件名必须以 .csv 结尾'), size_bytes: z.number().int().min(1).max(10 * 1024 * 1024) }).strict()

export const JsonImportQuestionSchema = z.object({
  category_path: z.array(z.string().min(1)).min(1).max(3),
  question_type: z.enum(['single_choice', 'multiple_choice', 'judge']),
  question_text: z.string().min(1).max(1024),
  options: optionSchema.nullable().optional(),
  correct_answer: answerSchema.nullable().optional(),
  explanation: z.string().max(1024).nullable().optional(),
  image_urls: imageUrlSchema.optional(),
  option_image_urls: optionImageUrlsSchema.optional(),
}).strict().superRefine(questionShapeRules)

export const JsonImportRequestSchema = z.object({ library_id: positiveInt.optional(), questions: z.array(JsonImportQuestionSchema).min(1).max(5000) }).strict()

export const QuestionSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  question_type: z.enum(['single_choice', 'multiple_choice', 'judge']),
  status: z.enum(['draft', 'published', 'disabled']),
  question_text: z.string(),
  normalized_question_text: z.string(),
  options: optionSchema.nullable(),
  correct_answer: answerSchema.nullable(),
  reference_answer: referenceAnswerSchema,
  explanation: nullableString,
  image_urls: imageUrlsResponseSchema,
  option_image_urls: optionImageUrlsResponseSchema,
  ever_published: z.boolean(),
  published_at: nullableString,
  disabled_at: nullableString,
  lock_version: z.number().min(1),
  created_by: z.number(),
  updated_by: z.number(),
  created_at: dateString,
  updated_at: dateString,
}).strict().superRefine(questionShapeRules)

export const QuizV2QuestionSchema = z.object({
  id: positiveInt,
  category_id: positiveInt.nullable(),
  library_id: positiveInt,
  knowledge_point_id: positiveInt,
  question_type: questionTypeSchema,
  status: z.enum(['draft', 'published', 'disabled', 'deleted']),
  question_text: z.string(),
  normalized_question_text: z.string(),
  options: optionSchema.nullable(),
  correct_answer: answerSchema.nullable(),
  reference_answer: referenceAnswerSchema,
  explanation: nullableString,
  image_urls: imageUrlsResponseSchema,
  option_image_urls: optionImageUrlsResponseSchema,
  ever_published: z.boolean(),
  published_at: nullableString,
  disabled_at: nullableString,
  deleted_at: nullableString,
  restore_until: nullableString,
  current_revision_id: z.number().nullable(),
  current_revision_no: z.number().nullable(),
  pending_revision_id: z.number().nullable(),
  pending_revision_no: z.number().nullable(),
  has_pending_revision: z.boolean(),
  lock_version: positiveInt,
  created_by: positiveInt,
  updated_by: positiveInt,
  created_at: dateString,
  updated_at: dateString,
}).strict().superRefine(questionShapeRules)

const libraryStatusSchema = z.enum(['draft', 'published', 'suspended', 'archived', 'deleted'])
const libraryAccessModeSchema = z.enum(['access_mode_pending', 'free', 'course_entitlement'])
const contentStatusSchema = z.enum(['active', 'disabled', 'deleted'])

export const QuizLibrarySchema = z.object({
  id: positiveInt,
  library_code: z.string().min(1),
  name: z.string().min(1),
  normalized_name: z.string().min(1),
  description: nullableString,
  cover_url: nullableString,
  details: nullableString,
  access_mode: libraryAccessModeSchema,
  system_kind: z.enum(['none', 'migration_quarantine']),
  migration_state: z.enum(['pending_review', 'needs_organization', 'ready']),
  status: libraryStatusSchema,
  v2_enabled: z.boolean(),
  sort_order: z.number().int(),
  lock_version: positiveInt,
  published_at: nullableString,
  suspended_at: nullableString,
  archived_at: nullableString,
  deleted_at: nullableString,
  restore_until: nullableString,
  open_migration_issue_count: z.number().int().min(0),
  module_count: z.number().int().min(0),
  knowledge_point_count: z.number().int().min(0),
  question_count: z.number().int().min(0),
  created_at: dateString,
  updated_at: dateString,
}).strict()

export const QuizAccessModeConvertResponseSchema = z.object({
  library: QuizLibrarySchema,
  sessions_affected: z.number().int().min(0),
}).strict()

export const QuizMigrationIssueSchema = z.object({
  id: positiveInt,
  library_id: positiveInt,
  severity: z.enum(['warning', 'blocking']),
  status: z.enum(['open', 'resolved']),
  issue_code: z.string().min(1),
  legacy_object_type: z.enum(['category', 'question']),
  legacy_id: positiveInt,
  original_path: z.array(z.record(z.string(), jsonValueSchema)),
  resolution: z.string(),
  resolved_at: nullableString,
  created_at: dateString,
}).strict()

export const QuizMigrationReportSchema = z.object({
  generated_at: dateString,
  library_count: z.number().int().min(0),
  ready_library_count: z.number().int().min(0),
  pending_library_count: z.number().int().min(0),
  open_blocking_issue_count: z.number().int().min(0),
  mapped_category_count: z.number().int().min(0),
  mapped_question_count: z.number().int().min(0),
  issues: z.array(QuizMigrationIssueSchema),
}).strict()

export const QuizLibraryCreateSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).nullable().optional(),
  cover_url: z.string().max(512).nullable().optional(),
  details: z.string().max(10000).nullable().optional(),
  access_mode: libraryAccessModeSchema.optional(),
  sort_order: z.number().int().optional(),
}).strict()

export const QuizLibraryUpdateSchema = z.object({
  lock_version: positiveInt,
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).nullable().optional(),
  cover_url: z.string().max(512).nullable().optional(),
  details: z.string().max(10000).nullable().optional(),
  access_mode: libraryAccessModeSchema.optional(),
  v2_enabled: z.boolean().optional(),
  sort_order: z.number().int().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'lock_version'), { message: '至少需要一个题库变更字段' })

export const QuizCourseBindingSchema = z.object({
  id: positiveInt,
  course_id: positiveInt,
  library_id: positiveInt,
  status: z.enum(['active', 'inactive']),
  lock_version: positiveInt,
  created_by: positiveInt.nullable(),
  updated_by: positiveInt.nullable(),
  created_at: dateString,
  updated_at: dateString,
}).strict()

export const QuizCourseOptionSchema = z.object({
  id: positiveInt,
  title: z.string().min(1),
}).strict()

export const QuizKnowledgePointSchema = z.object({
  id: positiveInt,
  library_id: positiveInt,
  module_id: positiveInt,
  name: z.string().min(1),
  normalized_name: z.string().min(1),
  description: nullableString,
  status: contentStatusSchema,
  system_kind: z.enum(['none', 'uncategorized']),
  sort_order: z.number().int(),
  lock_version: positiveInt,
  question_count: z.number().int().min(0),
  disabled_at: nullableString.optional().default(null),
  deleted_at: nullableString.optional().default(null),
  restore_until: nullableString.optional().default(null),
  created_at: dateString,
  updated_at: dateString,
}).strict()

export const QuizModuleSchema = z.object({
  id: positiveInt,
  library_id: positiveInt,
  name: z.string().min(1),
  normalized_name: z.string().min(1),
  description: nullableString,
  status: contentStatusSchema,
  system_kind: z.enum(['none', 'pending_organization']),
  sort_order: z.number().int(),
  lock_version: positiveInt,
  question_count: z.number().int().min(0),
  disabled_at: nullableString.optional().default(null),
  deleted_at: nullableString.optional().default(null),
  restore_until: nullableString.optional().default(null),
  knowledge_points: z.array(QuizKnowledgePointSchema),
  created_at: dateString,
  updated_at: dateString,
}).strict()

export const QuizContentTreeSchema = z.object({ library_id: positiveInt, modules: z.array(QuizModuleSchema) }).strict()

export const QuizQuestionRevisionSchema = z.object({
  id: positiveInt,
  question_id: positiveInt,
  revision_no: positiveInt,
  status: z.enum(['draft', 'published', 'superseded', 'discarded']),
  question_type: questionTypeSchema,
  question_text: z.string(),
  normalized_question_text: z.string(),
  options: optionSchema.nullable(),
  correct_answer: answerSchema.nullable(),
  reference_answer: referenceAnswerSchema,
  explanation: nullableString,
  image_urls: imageUrlsResponseSchema,
  option_image_urls: optionImageUrlsResponseSchema,
  published_at: nullableString,
  created_by: positiveInt.nullable(),
  created_at: dateString,
}).strict().superRefine(questionShapeRules)

export const QuizModuleCreateSchema = z.object({
  library_id: positiveInt,
  name: z.string().min(1).max(128),
  description: z.string().max(256).nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict()

export const QuizModuleUpdateSchema = z.object({
  lock_version: positiveInt,
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(256).nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'lock_version'), { message: '至少需要一个模块变更字段' })

export const QuizKnowledgePointCreateSchema = z.object({
  module_id: positiveInt,
  name: z.string().min(1).max(128),
  description: z.string().max(256).nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict()

export const QuizKnowledgePointUpdateSchema = z.object({
  lock_version: positiveInt,
  module_id: positiveInt.optional(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(256).nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'lock_version'), { message: '至少需要一个知识点变更字段' })

export const QuizContentStatusUpdateSchema = z.object({ status: z.enum(['active', 'disabled']), lock_version: positiveInt }).strict()

export const QuizV2QuestionCreateSchema = z.object({
  knowledge_point_id: positiveInt,
  question_type: questionTypeSchema,
  question_text: z.string().min(1).max(1024),
  options: optionSchema.nullable().optional(),
  correct_answer: answerSchema.nullable().optional(),
  reference_answer: referenceAnswerSchema.optional(),
  explanation: z.string().max(1024).nullable().optional(),
  image_urls: imageUrlSchema.optional(),
  option_image_urls: optionImageUrlsSchema.optional(),
}).strict().superRefine(questionShapeRules)

export const QuizV2QuestionUpdateSchema = z.object({
  lock_version: positiveInt,
  knowledge_point_id: positiveInt.optional(),
  question_type: questionTypeSchema.optional(),
  question_text: z.string().min(1).max(1024).optional(),
  options: optionSchema.nullable().optional(),
  correct_answer: answerSchema.nullable().optional(),
  reference_answer: referenceAnswerSchema.optional(),
  explanation: z.string().max(1024).nullable().optional(),
  image_urls: imageUrlSchema.optional(),
  option_image_urls: optionImageUrlsSchema.optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'lock_version'), { message: '至少需要一个题目变更字段' }).superRefine(questionShapeRules)

export const QuestionStatsSchema = z.object({
  question_id: z.number(),
  practice_first_attempts: z.number().min(0),
  practice_first_correct: z.number().min(0),
  practice_first_accuracy: z.coerce.number().min(0).max(100),
  exam_answers: z.number().min(0),
  exam_correct: z.number().min(0),
  exam_accuracy: z.coerce.number().min(0).max(100),
  aggregated_through: nullableString,
}).strict()

export const StatsOverviewSchema = z.object({
  calculated_at: dateString,
  aggregated_through: nullableString,
  library_count: z.number().int().min(0),
  draft_library_count: z.number().int().min(0),
  published_library_count: z.number().int().min(0),
  suspended_library_count: z.number().int().min(0),
  archived_library_count: z.number().int().min(0),
  module_count: z.number().int().min(0),
  active_module_count: z.number().int().min(0),
  disabled_module_count: z.number().int().min(0),
  knowledge_point_count: z.number().int().min(0),
  active_knowledge_point_count: z.number().int().min(0),
  disabled_knowledge_point_count: z.number().int().min(0),
  question_count: z.number().int().min(0),
  draft_question_count: z.number().int().min(0),
  published_question_count: z.number().int().min(0),
  disabled_question_count: z.number().int().min(0),
  practice_session_count: z.number().int().min(0),
  practice_first_attempts: z.number().int().min(0),
  practice_first_correct: z.number().int().min(0),
  practice_first_accuracy: z.coerce.number().min(0).max(100),
  completed_exam_count: z.number().int().min(0),
  timed_out_exam_count: z.number().int().min(0),
  exam_answers: z.number().int().min(0),
  exam_correct: z.number().int().min(0),
  exam_accuracy: z.coerce.number().min(0).max(100),
}).strict()

export const QuestionStatsListItemSchema = QuestionStatsSchema.omit({ question_id: true }).extend({
  question_id: positiveInt,
  question_text: z.string(),
  library_id: positiveInt,
  library_name: z.string(),
  module_id: positiveInt,
  module_name: z.string(),
  knowledge_point_id: positiveInt,
  knowledge_point_name: z.string(),
  question_type: z.enum(['single_choice', 'multiple_choice', 'judge']),
  status: z.enum(['draft', 'published', 'disabled', 'deleted']),
}).strict()

export const DailyStatsItemSchema = z.object({
  date: z.string().min(1),
  practice_attempts: z.number().int().min(0),
  active_users: z.number().int().min(0),
}).strict()

export const DailyStatsSchema = z.array(DailyStatsItemSchema)

export const UserStatsListItemSchema = z.object({
  user_id: positiveInt,
  nickname: nullableString,
  phone_masked: nullableString,
  practice_total_attempts: z.number().int().min(0),
  practice_first_attempts: z.number().int().min(0),
  practice_first_correct: z.number().int().min(0),
  practice_answered_questions: z.number().int().min(0),
  checkin_days: z.number().int().min(0),
  consecutive_days: z.number().int().min(0),
}).strict()

export const UserStatsPageSchema = z.object({
  items: z.array(UserStatsListItemSchema),
  total: z.number().int().min(0),
  page: positiveInt,
  page_size: positiveInt,
}).strict()

export const UserPracticeDaySchema = z.object({
  date: z.string().min(1),
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  accuracy: z.coerce.number().min(0).max(100),
}).strict()

export const UserExamRoundSchema = z.object({
  exam_id: positiveInt,
  status: z.enum(['in_progress', 'completed', 'timed_out', 'abandoned']),
  started_at: dateString,
  settled_at: nullableString,
  question_count: z.number().int().min(1),
  correct_count: z.number().int().min(0).nullable(),
  wrong_count: z.number().int().min(0).nullable(),
  unanswered_count: z.number().int().min(0).nullable(),
  score: z.coerce.number().min(0).max(100).nullable(),
}).strict()

export const UserPracticeStatsSchema = z.object({
  user_id: positiveInt,
  library_id: positiveInt,
  date_from: z.string().min(1),
  date_to: z.string().min(1),
  total_attempts: z.number().int().min(0),
  answered_questions: z.number().int().min(0),
  first_attempts: z.number().int().min(0),
  first_correct: z.number().int().min(0),
  first_accuracy: z.coerce.number().min(0).max(100),
  active_days: z.number().int().min(0),
  daily: z.array(UserPracticeDaySchema),
  exam_rounds: z.array(UserExamRoundSchema),
  exam_settled_count: z.number().int().min(0),
  exam_average_score: z.coerce.number().min(0).max(100).nullable(),
  exam_highest_score: z.coerce.number().min(0).max(100).nullable(),
  exam_latest_score: z.coerce.number().min(0).max(100).nullable(),
}).strict()

export const QuizImageUploadCreateSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(128),
  size_bytes: z.number().int().min(1).max(10 * 1024 * 1024),
}).strict()

export const QuizImageUploadSchema = z.object({
  object_key: z.string().min(1),
  upload_url: z.string().url().max(2048),
  public_url: z.string().url().max(2048),
  expires_at: dateString,
}).strict()

export const BatchItemErrorSchema = z.object({
  question_id: z.number(),
  code: z.number(),
  field: nullableString,
  message: z.string(),
}).strict()

export const BatchResponseSchema = z.object({
  succeeded: z.boolean(),
  updated_count: z.number().min(0),
  errors: z.array(BatchItemErrorSchema),
}).strict()

export const ImportJobSchema = z.object({
  id: z.number(),
  admin_id: z.number().nullable(),
  library_id: z.number().nullable().optional(),
  source_type: z.enum(['csv', 'json']),
  status: z.enum([
    'queued',
    'validating',
    'importing',
    'awaiting_category_confirmation',
    'succeeded',
    'validation_failed',
    'failed',
    'cancelled',
    'expired',
  ]),
  source_size_bytes: z.number().min(1).max(10 * 1024 * 1024),
  total_rows: z.number().min(0).max(5000),
  validated_rows: z.number().min(0).max(5000),
  created_count: z.number().min(0).max(5000),
  error_count: z.number().min(0),
  heartbeat_at: nullableString,
  started_at: nullableString,
  finished_at: nullableString,
  retry_count: z.number().min(0),
  error_message: nullableString,
  report_available: z.boolean(),
  lock_version: positiveInt,
  validation_version: z.number().int().min(0),
  impact_version: z.string().length(64).nullable(),
  missing_category_count: z.number().int().min(0).max(500),
  affected_question_count: z.number().int().min(0).max(5000),
  confirmed_by: z.number().int().min(1).nullable(),
  confirmed_at: nullableString,
  execution_protected_until: nullableString,
  expires_at: dateString,
  created_at: dateString,
  updated_at: dateString,
}).strict()

export const ImportErrorItemSchema = z.object({
  row: positiveInt.nullable(),
  question_index: positiveInt.nullable(),
  field: z.string().min(1).max(128).nullable(),
  error_code: z.string().min(1).max(64).nullable(),
  message: z.string().min(1).max(1024),
}).strict()

export const ImportErrorPageSchema = z.object({
  items: z.array(ImportErrorItemSchema),
  total: z.number().int().min(0),
  page: positiveInt,
  page_size: z.literal(50),
  available_fields: z.array(z.string().min(1).max(128)),
  validation_version: z.number().int().min(0),
}).strict()

export const ImportCategoryImpactNodeSchema: z.ZodType<ImportCategoryImpactNode> = z.lazy(() => z.object({
  name: z.string().min(1).max(128),
  path: z.array(z.string().min(1).max(128)).min(1).max(3),
  depth: z.number().int().min(1).max(3),
  status: z.enum(['existing', 'will_create', 'blocked']),
  category_id: positiveInt.nullable(),
  direct_question_count: z.number().int().min(0).max(5000),
  subtree_question_count: z.number().int().min(0).max(5000),
  blocking_reasons: z.array(z.string()),
  children: z.array(ImportCategoryImpactNodeSchema),
}).strict())

export const ImportCategoryImpactSchema = z.object({
  job_id: positiveInt,
  status: z.enum([
    'queued',
    'validating',
    'importing',
    'awaiting_category_confirmation',
    'succeeded',
    'validation_failed',
    'failed',
    'cancelled',
    'expired',
  ]),
  tree: z.array(ImportCategoryImpactNodeSchema),
  new_category_count: z.number().int().min(0).max(500),
  reused_category_count: z.number().int().min(0),
  affected_question_count: z.number().int().min(0).max(5000),
  blocking_reasons: z.array(z.string()),
  lock_version: positiveInt,
  impact_version: z.string().regex(/^[0-9a-f]{64}$/),
  calculated_at: dateString,
}).strict()

export const ImportConfirmCategoriesRequestSchema = z.object({
  lock_version: positiveInt,
  impact_version: z.string().regex(/^[0-9a-f]{64}$/),
}).strict()

export const ImportCancelRequestSchema = z.object({ lock_version: positiveInt }).strict()

export const SignedUrlSchema = z.object({ url: z.string().min(1), expires_at: dateString }).strict()

export const AuditLogSchema = z.object({
  id: z.number(),
  actor_type: z.enum(['admin', 'system']),
  admin_id: z.number().nullable(),
  permission: nullableString,
  request_id: nullableString,
  ip_address: nullableString,
  action: z.string(),
  object_type: z.string(),
  object_id: z.number().nullable(),
  result: z.enum(['succeeded', 'failed']),
  changed_fields: z.record(z.string(), z.object({ before: jsonValueSchema, after: jsonValueSchema }).strict()).nullable(),
  target_ids: z.array(z.number()).nullable(),
  error_summary: nullableString,
  created_at: dateString,
}).strict()

export const QuizTaskMetricSchema = z.object({
  name: z.string(),
  runs: z.number().int().min(0),
  successes: z.number().int().min(0),
  failures: z.number().int().min(0),
  failure_count: z.number().int().min(0),
  retries: z.number().int().min(0),
  retry_count: z.number().int().min(0),
  total_runtime_seconds: z.number().min(0),
  runtime_seconds: z.number().min(0),
  last_runtime_seconds: z.number().min(0).nullable(),
  last_started_at: nullableString,
  last_finished_at: nullableString,
  last_heartbeat_at: nullableString,
  last_error: nullableString,
  last_error_type: nullableString,
  queue_depth: z.number().int().min(0),
  did_work: z.boolean(),
}).strict()

export const QuizTaskSnapshotSchema = z.object({
  source: z.enum(['process', 'redis', 'disabled', 'unavailable']),
  heartbeat_at: nullableString,
  processors: z.record(z.string(), QuizTaskMetricSchema),
  signals: z.object({
    ready: z.boolean(),
    stale: z.boolean(),
    heartbeat_age_seconds: z.number().min(0).nullable(),
    total_queue_depth: z.number().int().min(0),
    total_failures: z.number().int().min(0),
    stuck_processors: z.array(z.string()),
    stats_lag_seconds: z.number().min(0).nullable(),
    stats_lagging: z.boolean(),
    exam_timeout_queue_depth: z.number().int().min(0),
    oss_cleanup_queue_depth: z.number().int().min(0),
  }).strict(),
}).strict()

// 基础分页结构
export const PageDataSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
  })

// 用户 Schema（后续扩展）
export const UserSchema = z.object({
  id: z.number(),
  openid: z.string(),
  phone: z.string().nullable(),
  is_active: z.boolean(),
})

export type User = z.infer<typeof UserSchema>

// 校验辅助函数
export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[Zod validation error]', result.error.format())
    throw new Error(`API response validation failed: ${result.error.message}`)
  }
  return result.data
}

export function validateRequestOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new Error(`请求模型校验失败: ${result.error.message}`)
  return result.data
}
