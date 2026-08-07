export type QuestionType = 'single_choice' | 'multiple_choice' | 'judge'
export type QuestionStatus = 'draft' | 'published' | 'disabled'
export type CategoryStatus = 'active' | 'disabled'
export type ImportSourceType = 'csv' | 'json'
export type ImportStatus = 'queued' | 'validating' | 'importing' | 'succeeded' | 'validation_failed' | 'failed'
export type AnswerKey = 'A' | 'B' | 'C' | 'D'
export type Answer = AnswerKey | AnswerKey[]

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

export interface QuestionFilter {
  category_id?: number
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
  retry_count: number
  error_message: string | null
  report_available: boolean
  expires_at: string
  created_at: string
  updated_at: string
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
  page?: number
  page_size?: number
}

export interface AuditFieldChange {
  before: unknown
  after: unknown
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
