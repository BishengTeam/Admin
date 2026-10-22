import { describe, it, expect } from 'vitest'
import { QuestionSchema, QuizV2QuestionSchema } from '@/core/validation'

// 后端契约 score 是 Decimal，pydantic v2 JSON 序列化为字符串（如 "1.0"）。
// 2026-10-22 题库导入后题目带 score，列表接口触发 Zod 校验失败——
// 响应 schema 统一用 coerce 兼容数字/字符串，null 保持 null。
describe('quiz question response score coercion', () => {
  const baseQuestion = {
    id: 1,
    category_id: 1,
    question_type: 'judge',
    status: 'draft',
    question_text: '题干',
    normalized_question_text: '题干',
    options: null,
    correct_answer: 'A',
    explanation: null,
    image_urls: [],
    option_image_urls: {},
    tags: [],
    ever_published: false,
    published_at: null,
    disabled_at: null,
    lock_version: 1,
    created_by: 1,
    updated_by: 1,
    created_at: '2026-10-22T12:00:00Z',
    updated_at: '2026-10-22T12:00:00Z',
  }

  it('QuestionSchema 接受字符串分数并转为数字', () => {
    const parsed = QuestionSchema.parse({ ...baseQuestion, score: '1.0' })
    expect(parsed.score).toBe(1)
  })

  it('QuestionSchema 的 score 为 null 时保持 null', () => {
    const parsed = QuestionSchema.parse({ ...baseQuestion, score: null })
    expect(parsed.score).toBeNull()
  })

  it('QuizV2QuestionSchema 接受字符串分数并转为数字', () => {
    const parsed = QuizV2QuestionSchema.parse({
      ...baseQuestion,
      library_id: 6,
      knowledge_point_id: 22,
      deleted_at: null,
      restore_until: null,
      current_revision_id: null,
      current_revision_no: null,
      pending_revision_id: null,
      pending_revision_no: null,
      has_pending_revision: false,
      score: '2.5',
    })
    expect(parsed.score).toBe(2.5)
  })
})
