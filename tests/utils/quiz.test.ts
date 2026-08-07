import { describe, expect, it } from 'vitest'
import { formatQuestionPublishErrors, validateQuestionForPublish } from '@/utils/quiz'
import { answerToPayload } from '@/types/quiz'

const base = {
  question_type: 'single_choice' as const,
  question_text: 'HTTP 是什么？',
  options: { A: '协议', B: '数据库', C: '语言' },
  correct_answer: 'A' as const,
  explanation: 'HTTP 是应用层协议。',
}

describe('quiz publish preflight', () => {
  it('accepts a valid single-choice question', () => {
    expect(validateQuestionForPublish(base)).toEqual([])
  })

  it('enforces publish-time option, answer and explanation rules', () => {
    const errors = validateQuestionForPublish({
      ...base,
      question_type: 'multiple_choice',
      options: { A: '协议', B: '数据库' },
      correct_answer: 'A',
      explanation: ' ',
    })
    expect(formatQuestionPublishErrors(errors)).toEqual(expect.arrayContaining([
      'explanation：发布前必须填写解析',
      'options：多选题发布时必须有 A-D 四个连续选项',
      'correct_answer：多选题答案必须使用数组',
    ]))
  })

  it('keeps judge options fixed', () => {
    const errors = validateQuestionForPublish({
      ...base,
      question_type: 'judge',
      options: { A: '是', B: '否' },
      correct_answer: 'A',
    })
    expect(errors.some((error) => error.field === 'options')).toBe(true)
  })

  it('turns an empty multiple-choice selection into a nullable answer', () => {
    expect(answerToPayload([], 'multiple_choice')).toBeNull()
  })
})
