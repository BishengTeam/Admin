import { describe, expect, it } from 'vitest'
import {
  answerToPayload,
  countFillBlankPlaceholders,
  formatAnswerForDisplay,
  isFillBlankAnswer,
} from '@/types/quiz'
import { validateQuestionForPublish } from '@/utils/quiz'

describe('fill-blank and essay answer payloads', () => {
  it('normalizes fill-blank candidate groups and strips empties', () => {
    expect(
      answerToPayload([['SYN', 'SYN', '  '], ['SYN+ACK']], 'fill_blank'),
    ).toEqual([['SYN'], ['SYN+ACK']])
  })

  it('keeps essay reference answers as trimmed text', () => {
    expect(answerToPayload('  TCP 面向连接。  ', 'essay')).toBe('TCP 面向连接。')
    expect(answerToPayload('   ', 'essay')).toBeNull()
  })

  it('detects fill-blank answer shape and formats it for display', () => {
    expect(isFillBlankAnswer([['SYN'], ['80']])).toBe(true)
    expect(isFillBlankAnswer(['A', 'C'])).toBe(false)
    expect(formatAnswerForDisplay([['SYN', '同步'], ['80']])).toBe(
      '空1: SYN / 同步；空2: 80',
    )
    expect(formatAnswerForDisplay('TCP 面向连接。')).toBe('TCP 面向连接。')
    expect(formatAnswerForDisplay(null)).toBe('-')
  })

  it('counts consecutive-underscore placeholders only', () => {
    expect(countFillBlankPlaceholders('没有空位')).toBe(0)
    expect(countFillBlankPlaceholders('一个空____')).toBe(1)
    expect(countFillBlankPlaceholders('两个空____和______')).toBe(2)
    expect(countFillBlankPlaceholders('下划线不足___')).toBe(0)
  })
})

describe('validateQuestionForPublish for new question types', () => {
  it('requires placeholder count to match fill-blank groups', () => {
    const errors = validateQuestionForPublish({
      question_type: 'fill_blank',
      question_text: '两空____和____',
      options: null,
      correct_answer: [['只有一个']],
      explanation: '解析',
    })
    expect(errors.some((error) => error.message.includes('空数必须与题干空位'))).toBe(true)
  })

  it('rejects empty or oversized candidates per blank', () => {
    const errors = validateQuestionForPublish({
      question_type: 'fill_blank',
      question_text: '单空____',
      options: null,
      correct_answer: [['  ']],
      explanation: '解析',
    })
    expect(errors.some((error) => error.message.includes('至少填写一个候选答案'))).toBe(true)

    const tooLong = validateQuestionForPublish({
      question_type: 'fill_blank',
      question_text: '单空____',
      options: null,
      correct_answer: [['x'.repeat(201)]],
      explanation: '解析',
    })
    expect(tooLong.some((error) => error.message.includes('1-200 字'))).toBe(true)
  })

  it('accepts a complete fill-blank question', () => {
    const errors = validateQuestionForPublish({
      question_type: 'fill_blank',
      question_text: 'TCP 三次握手：____、____、ACK',
      options: null,
      correct_answer: [['SYN', '同步'], ['SYN+ACK']],
      explanation: '三次握手建立连接。',
    })
    expect(errors).toEqual([])
  })

  it('requires an essay reference answer and skips explanation requirement', () => {
    const missing = validateQuestionForPublish({
      question_type: 'essay',
      question_text: '简述 TCP 与 UDP 的区别。',
      options: null,
      correct_answer: null,
      explanation: null,
    })
    expect(missing.some((error) => error.message.includes('参考答案'))).toBe(true)
    expect(missing.some((error) => error.field === 'explanation')).toBe(false)

    const complete = validateQuestionForPublish({
      question_type: 'essay',
      question_text: '简述 TCP 与 UDP 的区别。',
      options: null,
      correct_answer: 'TCP 面向连接、可靠；UDP 无连接、轻量。',
      explanation: null,
    })
    expect(complete).toEqual([])
  })
})
