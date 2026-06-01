export type QuestionType = 'single_choice' | 'multiple_choice' | 'judge'

export interface Question {
  id: number
  category_id: number
  category_name: string
  question_type: QuestionType
  question_text: string
  options: Record<string, string>
  correct_answer: string
  explanation: string
}

export interface QuestionFilter {
  keyword?: string
  category_id?: number
}

export interface Category {
  id: number
  name: string
  parent_id: number | null
  children?: Category[]
}
