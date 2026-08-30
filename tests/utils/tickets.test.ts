import { describe, expect, it } from 'vitest'
import { parseQuizFeedbackQuestionId } from '@/utils/tickets'

describe('parseQuizFeedbackQuestionId', () => {
  it('extracts the question id from a quiz feedback ticket', () => {
    const content = [
      '【题目反馈】',
      '题目ID：1024',
      '题型：单选题',
      '题目：HTTP 默认端口是多少？',
      '说明：答案标注有误。',
    ].join('\n')
    expect(parseQuizFeedbackQuestionId(content)).toBe(1024)
  })

  it('supports half-width colon and surrounding spaces', () => {
    expect(parseQuizFeedbackQuestionId('【题目反馈】\n题目ID: 88\n说明：test')).toBe(88)
  })

  it('returns null for regular tickets or malformed feedback tickets', () => {
    expect(parseQuizFeedbackQuestionId('普通客服咨询')).toBeNull()
    expect(parseQuizFeedbackQuestionId(null)).toBeNull()
    expect(parseQuizFeedbackQuestionId(undefined)).toBeNull()
    expect(parseQuizFeedbackQuestionId('【题目反馈】\n题目ID：abc')).toBeNull()
    expect(parseQuizFeedbackQuestionId('【题目反馈】\n题目ID：0')).toBeNull()
  })
})
