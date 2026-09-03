import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('classroom workbench contracts', () => {
  it('imports question files through the shared parser and existing endpoint', async () => {
    const page = await readFile('src/pages/classrooms/QuestionsTab.tsx', 'utf8')
    const utility = await readFile('src/utils/classroomQuestionImport.ts', 'utf8')

    expect(page).toContain('readClassroomQuestionImportFile')
    expect(page).toContain("accept='.csv,.json'")
    expect(page).toContain("title='导入题目'")
    expect(page).toContain('importQuestions')
    expect(page).not.toContain('xlsx')
    expect(utility).toContain('MAX_IMPORT_QUESTIONS = 500')
  })

  it('uploads classroom videos without a browser-generated Content-Type header', async () => {
    const page = await readFile('src/pages/classrooms/VideosTab.tsx', 'utf8')

    expect(page).toContain("from '@/services/courseManagement'")
    expect(page).toContain('readVideoDuration')
    expect(page).toContain("file.slice(0, file.size, '')")
    expect(page).not.toContain("headers: { 'Content-Type': file.type")
    expect(page).toContain('if (!response.ok)')
  })
})
