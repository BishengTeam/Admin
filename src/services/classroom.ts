import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type {
  Classroom, ClassroomQuestion, ClassroomQuiz, ClassroomQuizProgress,
  ClassroomStudent, ClassroomSubmission, ClassroomSubmissionQuestion,
  ClassroomVideo,
} from '@/types/classroom'

export const classroomService = {
  async list(params: PageParams): Promise<PageData<Classroom>> {
    return http.get<PageData<Classroom>>('/admin/classrooms', { params })
  },
  async create(name: string): Promise<Classroom> {
    return http.post<Classroom>('/admin/classrooms', { name })
  },
  async rename(id: number, name: string): Promise<void> {
    return http.put<void>(`/admin/classrooms/${id}`, { name })
  },
  async stop(id: number): Promise<void> {
    return http.post<void>(`/admin/classrooms/${id}/stop`)
  },
  async refreshCode(id: number): Promise<{ join_code: string; join_code_expires_at: string }> {
    return http.post(`/admin/classrooms/${id}/join-code/refresh`)
  },

  async listStudents(id: number): Promise<ClassroomStudent[]> {
    return http.get(`/admin/classrooms/${id}/students`)
  },
  async removeStudent(id: number, userId: number): Promise<void> {
    return http.delete(`/admin/classrooms/${id}/students/${userId}`)
  },

  async videoUploadUrl(id: number, data: { filename: string; content_type: string; size_bytes: number }):
    Promise<{ storage_key: string; upload_url: string }> {
    return http.post(`/admin/classrooms/${id}/videos/upload-url`, data)
  },
  async createVideo(id: number, data: { title: string; storage_key: string; duration_seconds: number; size_bytes: number }):
    Promise<ClassroomVideo> {
    return http.post(`/admin/classrooms/${id}/videos`, data)
  },
  async listVideos(id: number): Promise<ClassroomVideo[]> {
    return http.get(`/admin/classrooms/${id}/videos`)
  },
  async deleteVideo(id: number, videoId: number): Promise<void> {
    return http.delete(`/admin/classrooms/${id}/videos/${videoId}`)
  },

  async importQuestions(id: number, questions: unknown[]): Promise<{ imported: number }> {
    return http.post(`/admin/classrooms/${id}/questions/import`, { questions })
  },
  async listQuestions(id: number, params: { status?: string } & PageParams): Promise<PageData<ClassroomQuestion>> {
    return http.get(`/admin/classrooms/${id}/questions`, { params })
  },
  async publishQuestions(id: number, questionIds: number[]): Promise<{ published: number }> {
    return http.post(`/admin/classrooms/${id}/questions/publish`, { question_ids: questionIds })
  },
  async deleteQuestion(id: number, questionId: number): Promise<void> {
    return http.delete(`/admin/classrooms/${id}/questions/${questionId}`)
  },

  async createQuiz(id: number, data: { title: string; duration_minutes: number; question_ids: number[] }): Promise<ClassroomQuiz> {
    return http.post(`/admin/classrooms/${id}/quizzes`, data)
  },
  async listQuizzes(id: number): Promise<ClassroomQuiz[]> {
    return http.get(`/admin/classrooms/${id}/quizzes`)
  },
  async endQuiz(id: number, quizId: number): Promise<void> {
    return http.post(`/admin/classrooms/${id}/quizzes/${quizId}/end`)
  },
  async quizProgress(id: number, quizId: number): Promise<ClassroomQuizProgress> {
    return http.get(`/admin/classrooms/${id}/quizzes/${quizId}/progress`)
  },
  async listSubmissions(id: number, quizId: number):
    Promise<{ questions: ClassroomSubmissionQuestion[]; submissions: ClassroomSubmission[] }> {
    return http.get(`/admin/classrooms/${id}/quizzes/${quizId}/submissions`)
  },
  async reviewSubmission(id: number, quizId: number, submissionId: number, data: { manual_scores: Record<string, number>; approve: boolean }):
    Promise<void> {
    return http.post(`/admin/classrooms/${id}/quizzes/${quizId}/submissions/${submissionId}/review`, data)
  },
}
