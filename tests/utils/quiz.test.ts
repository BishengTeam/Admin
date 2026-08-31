import { describe, expect, it } from 'vitest'
import { answerToPayload } from '@/types/quiz'

describe('quiz answer payload helpers', () => {
  it('turns an empty multiple-choice selection into a nullable answer', () => {
    expect(answerToPayload([], 'multiple_choice')).toBeNull()
  })
})
