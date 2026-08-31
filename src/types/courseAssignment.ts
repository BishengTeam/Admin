export type CourseAssignmentStatus = 'draft' | 'published' | 'disabled'
export type CourseAssignmentSubmissionStatus = 'draft' | 'submitted' | 'claimed' | 'graded'
export type CourseAssignmentQuestionType = 'single_choice' | 'multiple_choice' | 'judge' | 'essay'
export type CourseAssignmentReviewAction = 'save' | 'claim' | 'complete' | 'reopen'

export interface CourseAssignmentQuestion {
  question_id: number
  position: number
  question_type: CourseAssignmentQuestionType
  question_text: string
  options: Record<string, string> | null
  option_image_urls: Record<string, string>
  image_urls: string[]
  explanation: string | null
  reference_answer: string | null
  score: number
  is_essay: boolean
}

export interface CourseAssignment {
  id: number
  library_id: number
  library_name: string
  library_code: string
  course_ids: number[]
  status: CourseAssignmentStatus
  version_no: number
  question_count: number
  essay_count: number
  objective_count: number
  essay_total_score: number
  objective_total_score: number
  total_score: number
  published_at: string | null
  disabled_at: string | null
  lock_version: number
  questions: CourseAssignmentQuestion[]
}

export interface CourseAssignmentEssayScore {
  question_id: number
  score: number
}

export interface CourseAssignmentSubmissionFilter {
  course_id?: number
  library_id?: number
  assignment_id?: number
  status?: CourseAssignmentSubmissionStatus
  keyword?: string
  page: number
  page_size: number
}

export interface CourseAssignmentSubmissionListItem {
  id: number
  assignment_id: number
  library_id: number
  library_name: string
  course_ids: number[]
  user_id: number
  student_name: string
  student_phone: string | null
  status: CourseAssignmentSubmissionStatus
  config_version_no: number
  submitted_at: string | null
  claimed_at: string | null
  graded_at: string | null
  total_score: number | null
  lock_version: number
}

export interface CourseAssignmentResultQuestion extends CourseAssignmentQuestion {
  user_answer: string | string[] | null
  is_answered: boolean
  correct_answer: string | string[] | null
  earned_score: number | null
  manual_score: number | null
  review_comment: string | null
  requires_review: boolean
  submission_question_id: number
  is_objective_correct: boolean | null
}

export interface CourseAssignmentSubmissionDetail {
  id: number
  assignment_id: number
  library_id: number
  library_name: string
  course_ids: number[]
  user_id: number
  student_name: string
  student_phone: string | null
  status: CourseAssignmentSubmissionStatus
  config_version_no: number
  submitted_at: string | null
  claimed_by: number | null
  claimed_at: string | null
  graded_by: number | null
  graded_at: string | null
  total_score: number | null
  lock_version: number
  questions: CourseAssignmentResultQuestion[]
}

export interface CourseAssignmentReviewScore {
  submission_question_id: number
  score: number
  comment?: string | null
}

export interface CourseAssignmentReviewSaved {
  submission_id: number
  status: CourseAssignmentSubmissionStatus
  total_score: number | null
  lock_version: number
}

export interface CourseAssignmentReviewLog {
  id: number
  action: CourseAssignmentReviewAction
  admin_id: number | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: string
}
