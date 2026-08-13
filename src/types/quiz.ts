export type QuestionType = 'single_choice' | 'multiple_choice' | 'judge'
export type QuestionStatus = 'draft' | 'published' | 'disabled'
export type CategoryStatus = 'active' | 'disabled'
export type ImportSourceType = 'csv' | 'json'
export type ImportStatus =
  | 'queued'
  | 'validating'
  | 'importing'
  | 'awaiting_category_confirmation'
  | 'succeeded'
  | 'validation_failed'
  | 'failed'
  | 'cancelled'
  | 'expired'
export type AnswerKey = 'A' | 'B' | 'C' | 'D'
export type Answer = AnswerKey | AnswerKey[]
export type CategoryImpactAction = 'disable' | 'move' | 'delete'
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface Category {
  id: number
  name: string
  normalized_name: string
  parent_id: number | null
  depth: number
  description: string | null
  status: CategoryStatus
  sort_order: number
  ever_had_question: boolean
  lock_version: number
  created_by: number
  updated_by: number
  created_at: string
  updated_at: string
  children?: Category[]
}

export interface CategoryCreate {
  name: string
  parent_id?: number | null
  description?: string | null
  sort_order?: number
}

export interface CategoryUpdate {
  lock_version: number
  name?: string
  parent_id?: number | null
  description?: string | null
  sort_order?: number
}

export interface CategoryStatusUpdate {
  status: CategoryStatus
  lock_version: number
}

export interface CategoryImpactQuery {
  action: CategoryImpactAction
  target_parent_id?: number | null
}

export interface CategoryImpact {
  category_id: number
  action: CategoryImpactAction
  target_parent_id: number | null
  descendant_category_count: number
  draft_question_count: number
  published_question_count: number
  disabled_question_count: number
  affected_new_pool_question_count: number
  history_snapshot_affected: false
  can_execute: boolean
  blocking_reasons: string[]
  calculated_at: string
}

export interface Question {
  id: number
  category_id: number
  question_type: QuestionType
  status: QuestionStatus
  question_text: string
  normalized_question_text: string
  options: Record<string, string> | null
  correct_answer: Answer | null
  explanation: string | null
  ever_published: boolean
  published_at: string | null
  disabled_at: string | null
  lock_version: number
  created_by: number
  updated_by: number
  created_at: string
  updated_at: string
}

export interface QuestionCreate {
  category_id: number
  question_type: QuestionType
  question_text: string
  options?: Record<string, string> | null
  correct_answer?: Answer | null
  explanation?: string | null
}

export interface QuestionUpdate {
  lock_version: number
  category_id?: number
  question_type?: QuestionType
  question_text?: string
  options?: Record<string, string> | null
  correct_answer?: Answer | null
  explanation?: string | null
}

export interface VersionRequest {
  lock_version: number
}

export interface BatchTarget {
  question_id: number
  lock_version: number
}

export interface BatchRequest {
  items: BatchTarget[]
}

export interface BatchItemError {
  question_id: number
  code: number
  field: string | null
  message: string
}

export interface BatchResponse {
  succeeded: boolean
  updated_count: number
  errors: BatchItemError[]
}

export interface QuestionStats {
  question_id: number
  practice_first_attempts: number
  practice_first_correct: number
  practice_first_accuracy: number
  exam_answers: number
  exam_correct: number
  exam_accuracy: number
  aggregated_through: string | null
}

export interface StatsOverview {
  calculated_at: string
  aggregated_through: string | null
  category_count: number
  active_category_count: number
  disabled_category_count: number
  question_count: number
  draft_question_count: number
  published_question_count: number
  disabled_question_count: number
  practice_session_count: number
  practice_first_attempts: number
  practice_first_correct: number
  practice_first_accuracy: number
  completed_exam_count: number
  timed_out_exam_count: number
  exam_answers: number
  exam_correct: number
  exam_accuracy: number
}

export interface QuestionStatsListItem extends QuestionStats {
  question_text: string
  category_id: number
  category_name: string
  question_type: QuestionType
  status: QuestionStatus
}

export interface StatsQuestionFilter extends QuestionFilter {}

export interface QuestionFilter {
  category_id?: number
  include_descendants?: boolean
  question_type?: QuestionType
  status?: QuestionStatus
  keyword?: string
  page?: number
  page_size?: number
}

export interface CsvImportMetadata {
  filename: string
  size_bytes: number
}

export interface ImportQuestion {
  category_path: string[]
  question_type: QuestionType
  question_text: string
  options?: Record<string, string> | null
  correct_answer?: Answer | null
  explanation?: string | null
}

export interface JsonImportRequest {
  questions: ImportQuestion[]
}

export interface ImportFilter {
  status?: ImportStatus
  source_type?: ImportSourceType
  page?: number
  page_size?: number
}

export interface ImportJob {
  id: number
  admin_id: number | null
  source_type: ImportSourceType
  status: ImportStatus
  source_size_bytes: number
  total_rows: number
  validated_rows: number
  created_count: number
  error_count: number
  heartbeat_at: string | null
  started_at: string | null
  finished_at: string | null
  retry_count: number
  error_message: string | null
  report_available: boolean
  lock_version: number
  validation_version: number
  impact_version: string | null
  missing_category_count: number
  affected_question_count: number
  confirmed_by: number | null
  confirmed_at: string | null
  execution_protected_until: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface ImportErrorItem {
  row: number | null
  question_index: number | null
  field: string | null
  error_code: string | null
  message: string
}

export interface ImportErrorFilter {
  field?: string
  page?: number
}

export interface ImportErrorPage {
  items: ImportErrorItem[]
  total: number
  page: number
  page_size: 50
  available_fields: string[]
  validation_version: number
}

export type ImportCategoryImpactNodeStatus = 'existing' | 'will_create' | 'blocked'

export interface ImportCategoryImpactNode {
  name: string
  path: string[]
  depth: number
  status: ImportCategoryImpactNodeStatus
  category_id: number | null
  direct_question_count: number
  subtree_question_count: number
  blocking_reasons: string[]
  children: ImportCategoryImpactNode[]
}

export interface ImportCategoryImpact {
  job_id: number
  status: ImportStatus
  tree: ImportCategoryImpactNode[]
  new_category_count: number
  reused_category_count: number
  affected_question_count: number
  blocking_reasons: string[]
  lock_version: number
  impact_version: string
  calculated_at: string
}

export interface ImportConfirmCategoriesRequest {
  lock_version: number
  impact_version: string
}

export interface ImportCancelRequest {
  lock_version: number
}

export interface SignedUrl {
  url: string
  expires_at: string
}

export interface AuditFilter {
  admin_id?: number
  action?: string
  object_type?: string
  object_id?: number
  result?: 'succeeded' | 'failed'
  request_id?: string
  start_at?: string
  end_at?: string
  page?: number
  page_size?: number
}

export interface AuditFieldChange {
  before: JsonValue
  after: JsonValue
}

export interface AuditLog {
  id: number
  actor_type: 'admin' | 'system'
  admin_id: number | null
  permission: string | null
  request_id: string | null
  ip_address: string | null
  action: string
  object_type: string
  object_id: number | null
  result: 'succeeded' | 'failed'
  changed_fields: Record<string, AuditFieldChange> | null
  target_ids: number[] | null
  error_summary: string | null
  created_at: string
}

export interface QuizTaskMetric {
  name: string
  runs: number
  successes: number
  failures: number
  failure_count: number
  retries: number
  retry_count: number
  total_runtime_seconds: number
  runtime_seconds: number
  last_runtime_seconds: number | null
  last_started_at: string | null
  last_finished_at: string | null
  last_heartbeat_at: string | null
  last_error: string | null
  last_error_type: string | null
  queue_depth: number
  did_work: boolean
}

export interface QuizTaskSnapshot {
  source: 'process' | 'redis' | 'disabled' | 'unavailable'
  heartbeat_at: string | null
  processors: Record<string, QuizTaskMetric>
  signals: {
    ready: boolean
    stale: boolean
    heartbeat_age_seconds: number | null
    total_queue_depth: number
    total_failures: number
    stuck_processors: string[]
    stats_lag_seconds: number | null
    stats_lagging: boolean
    exam_timeout_queue_depth: number
    oss_cleanup_queue_depth: number
  }
}

export interface QuizTaskProbe {
  endpoint: 'health' | 'ready'
  http_status: number
  code: number
  status: string
  checks: Record<string, string>
  quiz_tasks: QuizTaskSnapshot
}

export const QUESTION_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const
export type QuestionOptionKey = (typeof QUESTION_OPTION_KEYS)[number]

export function answerToArray(answer: Answer | null | undefined): string[] {
  // Multiple-choice answers in the frozen admin contract are arrays.  Do not
  // split a legacy "AC" string here: accepting that shape would hide an old
  // runtime response instead of exposing the contract mismatch.
  return Array.isArray(answer) ? answer : []
}

export function answerToPayload(answer: unknown, type: QuestionType): Answer | null {
  if (answer == null || answer === '') return null
  if (type === 'multiple_choice') {
    if (!Array.isArray(answer)) return null
    if (answer.length === 0) return null
    return Array.from(new Set(answer.map(String))).sort() as AnswerKey[]
  }
  return (Array.isArray(answer) ? answer[0] ?? null : String(answer)) as AnswerKey | null
}
