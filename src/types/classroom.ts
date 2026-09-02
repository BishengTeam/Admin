export interface Classroom {
  id: number
  name: string
  teacher_name?: string
  status: 'active' | 'stopped'
  join_code: string | null
  join_code_expires_at: string | null
  student_count: number
  video_count: number
  question_count: number
  ongoing_quiz: boolean
  created_at: string
}

export interface ClassroomStudent {
  id: number
  user_id: number
  real_name: string
  joined_at: string
}

export interface ClassroomVideo {
  id: number
  title: string
  duration_seconds: number
  size_bytes: number
  sort_order: number
  created_at: string
}

export type ClassroomQuestionType = 'single' | 'multiple' | 'judge' | 'blank' | 'short'

export interface ClassroomQuestion {
  id: number
  type: ClassroomQuestionType
  stem: string
  options: string[] | null
  answer: string | null
  analysis: string | null
  score: number
  status: 'draft' | 'published'
  created_at: string
}

export interface ClassroomQuiz {
  id: number
  title: string
  duration_minutes: number
  question_count: number
  status: 'ongoing' | 'ended'
  started_at: string
  ended_at: string | null
  submitted_count: number
  student_count: number
}

export interface ClassroomQuizProgress {
  quiz_id: number
  status: string
  submitted_count: number
  student_count: number
  remaining_seconds: number
}

export interface ClassroomSubmission {
  id: number
  user_id: number
  student_name: string
  answers: Record<string, string>
  auto_score: number
  manual_score: number
  total_score: number
  status: 'pending_review' | 'approved'
  submitted_at: string
  manual_scores: Record<string, number>
  attachments: ClassroomAttachmentItem[]
}

export type ClassroomAttachmentKind = 'image' | 'document' | 'archive'

export interface ClassroomAttachmentItem {
  id: number
  question_id: number
  kind: ClassroomAttachmentKind
  filename: string
  content_type: string
  size_bytes: number
  url: string
}

export interface ClassroomSubmissionQuestion {
  id: number
  type: ClassroomQuestionType
  stem: string
  options: string[] | null
  answer: string | null
  score: number
  analysis: string | null
}
