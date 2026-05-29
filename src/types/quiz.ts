export type QuestionType = 'single' | 'multi'

export interface QuestionOption {
  label: string
  content: string
}

export interface Question {
  id: number
  category_id: number
  category_name: string
  type: QuestionType
  content: string
  options: QuestionOption[]
  correct_answer: string[]
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
