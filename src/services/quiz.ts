import { http } from '@/core/request'
import type { Category, Question, QuestionFilter } from '@/types/quiz'
import type { PageData, PageParams } from '@/types/api'

export const quizService = {
  async listCategories(): Promise<Category[]> {
    return http.get<Category[]>('/admin/quiz/categories')
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    return http.post<Category>('/admin/quiz/categories', data)
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<void> {
    return http.put<void>(`/admin/quiz/categories/${id}`, data)
  },

  async deleteCategory(id: number): Promise<void> {
    return http.delete<void>(`/admin/quiz/categories/${id}`)
  },

  async listQuestions(params: QuestionFilter & PageParams): Promise<PageData<Question>> {
    return http.get<PageData<Question>>('/admin/quiz/questions', { params })
  },

  async createQuestion(data: Omit<Question, 'id'>): Promise<Question> {
    return http.post<Question>('/admin/quiz/questions', data)
  },

  async updateQuestion(id: number, data: Partial<Question>): Promise<void> {
    return http.put<void>(`/admin/quiz/questions/${id}`, data)
  },

  async deleteQuestion(id: number): Promise<void> {
    return http.delete<void>(`/admin/quiz/questions/${id}`)
  },

  async deleteQuestions(ids: number[]): Promise<void> {
    return http.post<void>('/admin/quiz/questions/batch-delete', { ids })
  },

  async importQuestions(data: {
    category_id: number
    questions: { question_text: string; options: Record<string, string>; answer: string; question_type: string }[]
  }): Promise<{ count: number }> {
    return http.post<{ count: number }>('/admin/quiz/import', data)
  },
}
