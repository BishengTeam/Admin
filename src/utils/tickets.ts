const QUIZ_FEEDBACK_QUESTION_ID_PATTERN = /^题目ID[：:]\s*(\d+)\s*$/m
const TICKET_IMAGE_LINE_PATTERN = /^图片[：:]\s*(.+)$/gm
const TICKET_IMAGE_LINE_TEST = /^图片[：:]\s*.+$/
const TICKET_IMAGE_URL_PATTERN = /^\/api\/media\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:jpe?g|png|webp|gif)$/i

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

/**
 * 小程序「意见反馈」提交的工单在「图片：」行携带逗号分隔的 /api/media 图片地址。
 * 只接受图片扩展名，防止把误传的 zip/pdf 等文件塞进 <img>；返回去重后的相对 URL。
 */
export function parseTicketImages(content: string | null | undefined): string[] {
  if (!content) return []
  const urls = new Set<string>()
  for (const match of content.matchAll(TICKET_IMAGE_LINE_PATTERN)) {
    for (const part of match[1].split(/[，,]/)) {
      const url = part.trim()
      if (TICKET_IMAGE_URL_PATTERN.test(url)) urls.add(url)
    }
  }
  return [...urls]
}

/** 详情/列表展示纯文本时隐藏「图片：」协议行，图片由缩略图区域渲染。 */
export function stripTicketImageLine(content: string | null | undefined): string {
  if (!content) return ''
  return content
    .split('\n')
    .filter(line => !TICKET_IMAGE_LINE_TEST.test(line))
    .join('\n')
    .trim()
}
