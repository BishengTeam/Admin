import request from '@/core/request'
import type { Category, Question, QuestionFilter } from '@/types/quiz'
import type { PageData, PageParams } from '@/types/api'

export const quizService = {
  async listCategories(): Promise<Category[]> {
    return request.get('/admin/quiz/categories')
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    return request.post('/admin/quiz/categories', data)
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<void> {
    return request.put(`/admin/quiz/categories/${id}`, data)
  },

  async deleteCategory(id: number): Promise<void> {
    return request.delete(`/admin/quiz/categories/${id}`)
  },

  async listQuestions(params: QuestionFilter & PageParams): Promise<PageData<Question>> {
    return request.get('/admin/quiz/questions', { params })
  },

  async createQuestion(data: Omit<Question, 'id'>): Promise<Question> {
    return request.post('/admin/quiz/questions', data)
  },

  async updateQuestion(id: number, data: Partial<Question>): Promise<void> {
    return request.put(`/admin/quiz/questions/${id}`, data)
  },

  async deleteQuestion(id: number): Promise<void> {
    return request.delete(`/admin/quiz/questions/${id}`)
  },

  async deleteQuestions(ids: number[]): Promise<void> {
    return request.post('/admin/quiz/questions/batch-delete', { ids })
  },

  async importQuestions(data: {
    category_id: number
    questions: { question_text: string; options: Record<string, string>; answer: string; question_type: string }[]
  }): Promise<{ count: number }> {
    return request.post('/admin/quiz/import', data)
  },
}
