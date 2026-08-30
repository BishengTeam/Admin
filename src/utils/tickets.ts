const QUIZ_FEEDBACK_QUESTION_ID_PATTERN = /^题目ID[：:]\s*(\d+)\s*$/m

/**
 * 小程序练习页「题目纠错」提交的工单以【题目反馈】开头，并携带「题目ID：xxx」一行。
 * 返回可定位的题目 ID；非题目反馈工单返回 null。
 */
export function parseQuizFeedbackQuestionId(content: string | null | undefined): number | null {
  if (!content || !content.includes('【题目反馈】')) return null
  const matched = content.match(QUIZ_FEEDBACK_QUESTION_ID_PATTERN)
  const questionId = matched ? Number(matched[1]) : Number.NaN
  return Number.isSafeInteger(questionId) && questionId > 0 ? questionId : null
}
