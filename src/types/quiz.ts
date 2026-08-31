export type QuestionType = 'single_choice' | 'multiple_choice' | 'judge' | 'essay'
export type QuestionStatus = 'draft' | 'published' | 'disabled'
export type StatsQuestionStatus = QuestionStatus | 'deleted'
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

export type QuizLibraryStatus = 'draft' | 'published' | 'suspended' | 'archived' | 'deleted'
export type QuizLibraryAccessMode = 'access_mode_pending' | 'free' | 'course_entitlement'
export type QuizContentStatus = 'active' | 'disabled' | 'deleted'
export type QuizLibraryLifecycleAction = 'publish' | 'suspend' | 'restore' | 'archive' | 'delete' | 'undo_delete' | 'reconcile_migration'

export interface QuizLibrary {
  id: number
  library_code: string
  name: string
  normalized_name: string
  description: string | null
  cover_url: string | null
  details: string | null
  access_mode: QuizLibraryAccessMode
  system_kind: 'none' | 'migration_quarantine'
  migration_state: 'pending_review' | 'needs_organization' | 'ready'
  status: QuizLibraryStatus
  v2_enabled: boolean
  sort_order: number
  lock_version: number
  published_at: string | null
  suspended_at: string | null
  archived_at: string | null
  deleted_at: string | null
  restore_until: string | null
  open_migration_issue_count: number
  module_count: number
  knowledge_point_count: number
  question_count: number
  created_at: string
  updated_at: string
}

export interface QuizMigrationIssue {
  id: number
  library_id: number
  severity: 'warning' | 'blocking'
  status: 'open' | 'resolved'
  issue_code: string
  legacy_object_type: 'category' | 'question'
  legacy_id: number
  original_path: Array<Record<string, JsonValue>>
  resolution: string
  resolved_at: string | null
  created_at: string
}

export interface QuizMigrationReport {
  generated_at: string
  library_count: number
  ready_library_count: number
  pending_library_count: number
  open_blocking_issue_count: number
  mapped_category_count: number
  mapped_question_count: number
  issues: QuizMigrationIssue[]
}

export interface QuizAccessModeConvertResponse {
  library: QuizLibrary
  sessions_affected: number
}

export interface QuizLibraryCreate {
  name: string
  description?: string | null
  cover_url?: string | null
  details?: string | null
  access_mode?: QuizLibraryAccessMode
  sort_order?: number
}

export interface QuizLibraryUpdate {
  lock_version: number
  name?: string
  description?: string | null
  cover_url?: string | null
  details?: string | null
  access_mode?: QuizLibraryAccessMode
  v2_enabled?: boolean
  sort_order?: number
}

export interface QuizLibraryFilter {
  status?: QuizLibraryStatus
  access_mode?: QuizLibraryAccessMode
  keyword?: string
  include_deleted?: boolean
}

export interface QuizCourseBinding {
  id: number
  course_id: number
  library_id: number
  status: 'active' | 'inactive'
  lock_version: number
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string
}

export interface QuizCourseOption {
  id: number
  title: string
}

export interface QuizKnowledgePoint {
  id: number
  library_id: number
  module_id: number
  name: string
  normalized_name: string
  description: string | null
  status: QuizContentStatus
  system_kind: 'none' | 'uncategorized'
  sort_order: number
  lock_version: number
  question_count: number
  disabled_at: string | null
  deleted_at: string | null
  restore_until: string | null
  created_at: string
  updated_at: string
}

export interface QuizModule {
  id: number
  library_id: number
  name: string
  normalized_name: string
  description: string | null
  status: QuizContentStatus
  system_kind: 'none' | 'pending_organization'
  sort_order: number
  lock_version: number
  question_count: number
  disabled_at: string | null
  deleted_at: string | null
  restore_until: string | null
  knowledge_points: QuizKnowledgePoint[]
  created_at: string
  updated_at: string
}

export interface QuizContentTree {
  library_id: number
  modules: QuizModule[]
}

export interface QuizModuleCreate {
  library_id: number
  name: string
  description?: string | null
  sort_order?: number
}

export interface QuizModuleUpdate {
  lock_version: number
  name?: string
  description?: string | null
  sort_order?: number
}

export interface QuizKnowledgePointCreate {
  module_id: number
  name: string
  description?: string | null
  sort_order?: number
}

export interface QuizKnowledgePointUpdate {
  lock_version: number
  module_id?: number
  name?: string
  description?: string | null
  sort_order?: number
}

export interface QuizV2Question {
  id: number
  category_id: number | null
  library_id: number
  knowledge_point_id: number
  question_type: QuestionType
  status: QuestionStatus | 'deleted'
  question_text: string
  normalized_question_text: string
  options: Record<string, string> | null
  correct_answer: Answer | null
  reference_answer: string | null
  explanation: string | null
  image_urls: string[]
  option_image_urls: Record<string, string>
  ever_published: boolean
  published_at: string | null
  disabled_at: string | null
  deleted_at: string | null
  restore_until: string | null
  current_revision_id: number | null
  current_revision_no: number | null
  pending_revision_id: number | null
  pending_revision_no: number | null
  has_pending_revision: boolean
  lock_version: number
  created_by: number
  updated_by: number
  created_at: string
  updated_at: string
}

export interface QuizQuestionRevision {
  id: number
  question_id: number
  revision_no: number
  status: 'draft' | 'published' | 'superseded' | 'discarded'
  question_type: QuestionType
  question_text: string
  normalized_question_text: string
  options: Record<string, string> | null
  correct_answer: Answer | null
  reference_answer: string | null
  explanation: string | null
  image_urls: string[]
  option_image_urls: Record<string, string>
  published_at: string | null
  created_by: number | null
  created_at: string
}

export interface QuizV2QuestionCreate {
  knowledge_point_id: number
  question_type: QuestionType
  question_text: string
  options?: Record<string, string> | null
  correct_answer?: Answer | null
  reference_answer?: string | null
  explanation?: string | null
  image_urls?: string[]
  option_image_urls?: Record<string, string>
}

export interface QuizV2QuestionUpdate {
  lock_version: number
  knowledge_point_id?: number
  question_type?: QuestionType
  question_text?: string
  options?: Record<string, string> | null
  correct_answer?: Answer | null
  reference_answer?: string | null
  explanation?: string | null
  image_urls?: string[]
  option_image_urls?: Record<string, string>
}

export interface QuizV2QuestionFilter {
  library_id?: number
  module_id?: number
  knowledge_point_id?: number
  question_id?: number
  question_type?: QuestionType
  status?: QuestionStatus | 'deleted'
  keyword?: string
  include_deleted?: boolean
  page?: number
  page_size?: number
}

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
  reference_answer: string | null
  explanation: string | null
  image_urls: string[]
  option_image_urls: Record<string, string>
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
  reference_answer?: string | null
  explanation?: string | null
  image_urls?: string[]
  option_image_urls?: Record<string, string>
}

export interface QuestionUpdate {
  lock_version: number
  category_id?: number
  question_type?: QuestionType
  question_text?: string
  options?: Record<string, string> | null
  correct_answer?: Answer | null
  reference_answer?: string | null
  explanation?: string | null
  image_urls?: string[]
  option_image_urls?: Record<string, string>
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
  library_count: number
  draft_library_count: number
  published_library_count: number
  suspended_library_count: number
  archived_library_count: number
  module_count: number
  active_module_count: number
  disabled_module_count: number
  knowledge_point_count: number
  active_knowledge_point_count: number
  disabled_knowledge_point_count: number
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
  library_id: number
  library_name: string
  module_id: number
  module_name: string
  knowledge_point_id: number
  knowledge_point_name: string
  question_type: QuestionType
  status: StatsQuestionStatus
}

export interface StatsQuestionFilter {
  library_id?: number
  module_id?: number
  knowledge_point_id?: number
  question_type?: QuestionType
  status?: StatsQuestionStatus
  include_deleted?: boolean
  keyword?: string
  sort?: 'updated_at' | 'practice_first_attempts' | 'practice_wrong_count'
  order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface DailyStatsItem {
  date: string
  practice_attempts: number
  active_users: number
}

export interface UserStatsListItem {
  user_id: number
  nickname: string | null
  phone_masked: string | null
  practice_total_attempts: number
  practice_first_attempts: number
  practice_first_correct: number
  practice_answered_questions: number
  checkin_days: number
  consecutive_days: number
}

export interface UserPracticeDay {
  date: string
  attempts: number
  correct: number
  accuracy: number
}

export interface UserExamRound {
  exam_id: number
  status: 'in_progress' | 'completed' | 'timed_out' | 'abandoned'
  started_at: string
  settled_at: string | null
  question_count: number
  correct_count: number | null
  wrong_count: number | null
  unanswered_count: number | null
  score: number | null
}

export interface UserPracticeStats {
  user_id: number
  library_id: number
  date_from: string
  date_to: string
  total_attempts: number
  answered_questions: number
  first_attempts: number
  first_correct: number
  first_accuracy: number
  active_days: number
  daily: UserPracticeDay[]
  exam_rounds: UserExamRound[]
  exam_settled_count: number
  exam_average_score: number | null
  exam_highest_score: number | null
  exam_latest_score: number | null
}

export interface QuizImageUpload {
  object_key: string
  upload_url: string
  public_url: string
  expires_at: string
}

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
  image_urls?: string[]
  option_image_urls?: Record<string, string>
}

export interface JsonImportRequest {
  library_id?: number
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
  library_id?: number | null
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
