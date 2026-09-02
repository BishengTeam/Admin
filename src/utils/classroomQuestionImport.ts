const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const MAX_IMPORT_QUESTIONS = 500

export interface ClassroomQuestionImportFile {
  text: string
  questionCount: number
}

async function readUtf8(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    throw new Error('JSON 文件必须使用 UTF-8 编码')
  }
}

export async function readClassroomQuestionImportFile(
  file: File,
): Promise<ClassroomQuestionImportFile> {
  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  if (extension !== 'json') throw new Error('仅支持 .json 文件')
  if (file.size < 1 || file.size > MAX_IMPORT_BYTES) {
    throw new Error('文件大小必须在 10MiB 以内')
  }

  const text = await readUtf8(file)
  let questions: unknown
  try {
    questions = JSON.parse(text)
  } catch {
    throw new Error('JSON 文件格式无效')
  }
  if (
    !Array.isArray(questions)
    || questions.length < 1
    || questions.length > MAX_IMPORT_QUESTIONS
    || questions.some(question => !question || typeof question !== 'object' || Array.isArray(question))
  ) {
    throw new Error(`顶层必须是包含 1 至 ${MAX_IMPORT_QUESTIONS} 个题目对象的 JSON 数组`)
  }
  return { text, questionCount: questions.length }
}
