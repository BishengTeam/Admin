import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}

vi.mock('@/core/request', () => ({ http }))

describe('course assignment score allocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allocates the objective remainder to the last objective question', async () => {
    const { allocateAssignmentScores } = await import('@/services/courseAssignment')
    const questions = Array.from({ length: 7 }, (_, index) => ({
      question_id: index + 1,
      is_essay: false,
    })).concat([
      { question_id: 8, is_essay: true },
      { question_id: 9, is_essay: true },
    ])

    const result = allocateAssignmentScores(questions, { 8: 20, 9: 20 })
    expect(result).toEqual({
      1: '8.57',
      2: '8.57',
      3: '8.57',
      4: '8.57',
      5: '8.57',
      6: '8.57',
      7: '8.58',
      8: '20.00',
      9: '20.00',
    })
  })

  it('requires essay-only assignments to total exactly 100', async () => {
    const { allocateAssignmentScores } = await import('@/services/courseAssignment')
    expect(() => allocateAssignmentScores(
      [{ question_id: 1, is_essay: true }],
      { 1: 100 },
    )).not.toThrow()
    expect(() => allocateAssignmentScores(
      [{ question_id: 1, is_essay: true }],
      { 1: 20 },
    )).toThrow('没有客观题时，问答题总分必须等于 100 分')
  })
})
