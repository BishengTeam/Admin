import type { Question } from '@/types/quiz'
import { QUESTION_OPTION_KEYS } from '@/types/quiz'

export interface QuestionPublishError {
  field: 'question_text' | 'options' | 'correct_answer' | 'explanation'
  message: string
}

const OPTION_KEY_SET = new Set<string>(QUESTION_OPTION_KEYS)

/**
 * Performs the publish-time checks that are deterministic from the list row.
 * The backend remains authoritative; this only prevents an avoidable request
 * and lets the administrator fix the field that would fail before submitting.
 */
export function validateQuestionForPublish(question: Pick<Question, 'question_type' | 'question_text' | 'options' | 'correct_answer' | 'explanation'>): QuestionPublishError[] {
  const errors: QuestionPublishError[] = []
  if (!question.question_text.trim()) {
    errors.push({ field: 'question_text', message: '发布前必须填写题干' })
  }
  if (!question.explanation?.trim()) {
    errors.push({ field: 'explanation', message: '发布前必须填写解析' })
  }

  const options = question.options ?? {}
  const keys = Object.keys(options)
  if (keys.some((key) => !String(options[key] ?? '').trim())) {
    errors.push({ field: 'options', message: '每个选项都必须填写内容' })
  }
  const expected = question.question_type === 'multiple_choice'
    ? [...QUESTION_OPTION_KEYS]
    : question.question_type === 'judge'
      ? ['A', 'B']
      : keys.length === 4
        ? ['A', 'B', 'C', 'D']
        : ['A', 'B', 'C']

  if (keys.some((key) => !OPTION_KEY_SET.has(key))) {
    errors.push({ field: 'options', message: '选项键仅允许 A-D' })
  }

  if (question.question_type === 'judge') {
    if (keys.length !== 2 || options.A !== '正确' || options.B !== '错误') {
      errors.push({ field: 'options', message: '判断题选项必须固定为 A=正确、B=错误' })
    }
  } else if (question.question_type === 'single_choice') {
    if (keys.length < 3 || keys.length > 4 || keys.some((key, index) => key !== expected[index])) {
      errors.push({ field: 'options', message: '单选题发布时必须有从 A 开始连续的 3-4 个选项' })
    }
  } else if (keys.length !== 4 || keys.some((key, index) => key !== expected[index])) {
    errors.push({ field: 'options', message: '多选题发布时必须有 A-D 四个连续选项' })
  }

  const answer = question.correct_answer
  if (question.question_type === 'multiple_choice') {
    if (!Array.isArray(answer)) {
      errors.push({ field: 'correct_answer', message: '多选题答案必须使用数组' })
    } else {
      const unique = new Set(answer)
      if (answer.length < 2 || answer.length > 4 || unique.size !== answer.length || answer.some((item) => !OPTION_KEY_SET.has(item))) {
        errors.push({ field: 'correct_answer', message: '多选题正确答案必须为 A-D 中 2-4 个不重复选项' })
      } else if (answer.some((item) => !keys.includes(item))) {
        errors.push({ field: 'correct_answer', message: '正确答案必须对应已有选项' })
      }
    }
  } else if (typeof answer !== 'string' || !keys.includes(answer)) {
    errors.push({ field: 'correct_answer', message: '请选择一个有效的正确答案' })
  }

  return errors
}

export function formatQuestionPublishErrors(errors: QuestionPublishError[]): string[] {
  return errors.map((error) => `${error.field}：${error.message}`)
}
