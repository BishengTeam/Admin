import { http } from '@/core/request'
import type { PageData } from '@/types/api'
import type {
  CourseAssignment,
  CourseAssignmentQuestion,
  CourseAssignmentEssayScore,
  CourseAssignmentReviewLog,
  CourseAssignmentReviewSaved,
  CourseAssignmentReviewScore,
  CourseAssignmentSubmissionDetail,
  CourseAssignmentSubmissionFilter,
  CourseAssignmentSubmissionListItem,
} from '@/types/courseAssignment'

function cleanFilter(filter: CourseAssignmentSubmissionFilter) {
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export const courseAssignmentService = {
  list(courseId: number, signal?: AbortSignal): Promise<CourseAssignment[]> {
    return http.get('/admin/course-assignments', {
      params: { course_id: courseId },
      signal,
    })
  },

  listAll(signal?: AbortSignal): Promise<CourseAssignment[]> {
    return http.get('/admin/course-assignments', { signal })
  },

  create(
    courseId: number,
    libraryId: number,
    essayScores: CourseAssignmentEssayScore[],
  ): Promise<CourseAssignment> {
    return http.post('/admin/course-assignments', {
      course_id: courseId,
      library_id: libraryId,
      essay_scores: essayScores,
    })
  },

  update(
    assignmentId: number,
    lockVersion: number,
    essayScores: CourseAssignmentEssayScore[],
  ): Promise<CourseAssignment> {
    return http.put(`/admin/course-assignments/${assignmentId}`, {
      lock_version: lockVersion,
      essay_scores: essayScores,
    })
  },

  publish(assignmentId: number, lockVersion: number): Promise<CourseAssignment> {
    return http.post(`/admin/course-assignments/${assignmentId}/publish`, {
      lock_version: lockVersion,
    })
  },

  disable(assignmentId: number, lockVersion: number): Promise<CourseAssignment> {
    return http.post(`/admin/course-assignments/${assignmentId}/disable`, {
      lock_version: lockVersion,
    })
  },

  listSubmissions(
    filter: CourseAssignmentSubmissionFilter,
    signal?: AbortSignal,
  ): Promise<PageData<CourseAssignmentSubmissionListItem>> {
    return http.get('/admin/course-assignments/submissions', {
      params: cleanFilter(filter),
      signal,
    })
  },

  getSubmission(submissionId: number, signal?: AbortSignal): Promise<CourseAssignmentSubmissionDetail> {
    return http.get(`/admin/course-assignments/submissions/${submissionId}`, { signal })
  },

  claim(submissionId: number, lockVersion: number): Promise<CourseAssignmentReviewSaved> {
    return http.post(`/admin/course-assignments/submissions/${submissionId}/claim`, {
      lock_version: lockVersion,
    })
  },

  saveReview(
    submissionId: number,
    lockVersion: number,
    scores: CourseAssignmentReviewScore[],
    complete: boolean,
  ): Promise<CourseAssignmentReviewSaved> {
    return http.put(`/admin/course-assignments/submissions/${submissionId}/review`, {
      lock_version: lockVersion,
      scores,
      complete,
    })
  },

  reopen(submissionId: number, lockVersion: number): Promise<CourseAssignmentReviewSaved> {
    return http.post(`/admin/course-assignments/submissions/${submissionId}/reopen`, {
      lock_version: lockVersion,
    })
  },

  listLogs(submissionId: number, signal?: AbortSignal): Promise<CourseAssignmentReviewLog[]> {
    return http.get(`/admin/course-assignments/submissions/${submissionId}/logs`, { signal })
  },
}

export function allocateAssignmentScores(
  questions: Array<Pick<CourseAssignmentQuestion, 'question_id' | 'is_essay'>>,
  essayScores: Record<number, number | null>,
) {
  const essays = questions.filter(question => question.is_essay)
  const objectives = questions.filter(question => !question.is_essay)
  const essayCents = essays.reduce((total, question) => {
    const score = essayScores[question.question_id]
    if (score == null || score <= 0) throw new Error('请为每道问答题配置大于 0 的分值')
    const cents = Math.round(score * 100)
    if (cents % 10 !== 0) throw new Error('问答题分值最多支持 1 位小数')
    return total + cents
  }, 0)
  if (essayCents > 10000) throw new Error('问答题总分不能超过 100 分')
  const remaining = 10000 - essayCents
  if (!objectives.length && remaining !== 0) throw new Error('没有客观题时，问答题总分必须等于 100 分')

  const result: Record<number, string> = {}
  essays.forEach(question => {
    result[question.question_id] = (Math.round((essayScores[question.question_id] ?? 0) * 100) / 100).toFixed(2)
  })
  const base = objectives.length ? Math.floor(remaining / objectives.length) : 0
  const remainder = remaining - base * objectives.length
  objectives.forEach((question, index) => {
    const cents = index === objectives.length - 1 ? base + remainder : base
    result[question.question_id] = (cents / 100).toFixed(2)
  })
  return result
}
