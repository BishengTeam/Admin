import { describe, expect, it } from 'vitest'
import { JsonImportQuestionSchema } from '@/core/validation'

const question = { question_type: 'judge', question_text: 'TCP面向连接。', correct_answer: 'A' }
describe('导入分类选填契约', () => {
  it.each([undefined, [], ['模块'], ['', 'TCP']])('保留空槽与一级路径，交给服务端安排默认归属：%j', (path) => {
    const result = JsonImportQuestionSchema.parse({ ...question, category_path: path })
    expect(result.category_path).toEqual(path)
  })
  it('允许独立模块与知识点字段', () => {
    expect(JsonImportQuestionSchema.parse({ ...question, knowledge_point_name: 'TCP' }).knowledge_point_name).toBe('TCP')
  })
  it('继续拒绝未知字段', () => {
    expect(JsonImportQuestionSchema.safeParse({ ...question, bypass: true }).success).toBe(false)
  })
})
