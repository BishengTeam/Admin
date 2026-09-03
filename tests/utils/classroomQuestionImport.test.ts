import { describe, expect, it } from 'vitest'
import { readClassroomQuestionImportFile, parseQuestionCSV } from '@/utils/classroomQuestionImport'

function makeFile(content: string, name = 'questions.json', type = 'application/json'): File {
  const bytes = new TextEncoder().encode(content)
  const file = new File([bytes], name, { type })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.slice().buffer as ArrayBuffer,
  })
  return file
}

describe('classroom question import', () => {
  it('reads JSON format and returns parsed questions', async () => {
    const original = `[
  {"type":"single","stem":"题干","options":["A","B","C","D"],"answer":"1","score":2}
]`
    const result = await readClassroomQuestionImportFile(makeFile(original))
    expect(result.questionCount).toBe(1)
    expect(result.format).toBe('json')
    expect(result.questions[0].type).toBe('single')
    expect(result.questions[0].stem).toBe('题干')
  })

  it('reads CSV format with Chinese type names and letter answers', async () => {
    const csv = [
      '题型,题干,选项A,选项B,选项C,选项D,答案,分值,解析',
      '单选,1+1=?,1,2,3,,B,2,基础',
      '判断,地球是圆的,,,,,对,1,',
      '填空,首都是____,,,,,北京,2,',
      '简答,简述TCP握手,,,,,,10,',
    ].join('\r\n')
    const result = await readClassroomQuestionImportFile(makeFile(csv, 'questions.csv', 'text/csv'))
    expect(result.questionCount).toBe(4)
    expect(result.format).toBe('csv')
    expect(result.questions[0].type).toBe('single')
    expect(result.questions[0].answer).toBe('1') // B → index 1
    expect(result.questions[1].answer).toBe('true') // 对 → true
    expect(result.questions[3].answer).toBeNull() // 简答无答案
  })

  it('parses CSV with multiple-choice comma-separated answers', () => {
    const csv = '题型,题干,选项A,选项B,选项C,选项D,答案,分值,解析\r\n多选,选哪些？,X,Y,Z,,"A,C",3,'
    const questions = parseQuestionCSV(csv)
    expect(questions[0].type).toBe('multiple')
    expect(questions[0].answer).toBe('0,2') // A,C → 0,2
  })

  it('rejects unsupported file types', async () => {
    await expect(readClassroomQuestionImportFile(makeFile('x', 'q.txt'))).rejects.toThrow(/仅支持/)
  })

  it('rejects invalid top-level shapes', async () => {
    await expect(readClassroomQuestionImportFile(makeFile('[]'))).rejects.toThrow(/1 至 500/)
    await expect(readClassroomQuestionImportFile(makeFile('{"questions":[]}'))).rejects.toThrow(/数组/)
  })

  it('rejects unknown question types in CSV', () => {
    const csv = '题型,题干,选项A,选项B,选项C,选项D,答案,分值,解析\r\n选择题,xxx,,,,,1,'
    expect(() => parseQuestionCSV(csv)).toThrow(/未知题型/)
  })
})
