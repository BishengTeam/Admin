import { describe, expect, it } from 'vitest'
import { readClassroomQuestionImportFile } from '@/utils/classroomQuestionImport'

function jsonFile(content: string, name = 'questions.json'): File {
  const bytes = new TextEncoder().encode(content)
  const file = new File([bytes], name, { type: 'application/json' })
  // 当前 jsdom File 未实现 Blob.arrayBuffer；生产 Chrome/Edge 会实现。
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.slice().buffer as ArrayBuffer,
  })
  return file
}

describe('classroom question import', () => {
  it('reads the original JSON-array format without rewriting it', async () => {
    const original = `[
  {"type":"single","stem":"题干","options":["A","B","C","D"],"answer":"1","score":2}
]`
    const result = await readClassroomQuestionImportFile(jsonFile(original))

    expect(result).toEqual({ text: original, questionCount: 1 })
  })

  it('rejects non-JSON files and invalid top-level shapes', async () => {
    await expect(readClassroomQuestionImportFile(jsonFile('[]', 'questions.csv')))
      .rejects.toThrow(/仅支持 \.json/)
    await expect(readClassroomQuestionImportFile(jsonFile('[]')))
      .rejects.toThrow(/1 至 500/)
    await expect(readClassroomQuestionImportFile(jsonFile('{"questions":[]}')))
      .rejects.toThrow(/JSON 数组/)
  })
})
