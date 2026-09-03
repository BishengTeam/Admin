const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const MAX_IMPORT_QUESTIONS = 500

export interface ClassroomQuestionImportFile {
  text: string
  questionCount: number
}

export interface ParsedQuestion {
  type: string
  stem: string
  options: string[] | null
  answer: string | null
  analysis: string | null
  score: number
}

const TYPE_MAP: Record<string, string> = {
  '单选': 'single', '单选题': 'single', 'single': 'single',
  '多选': 'multiple', '多选题': 'multiple', 'multiple': 'multiple',
  '判断': 'judge', '判断题': 'judge', 'judge': 'judge',
  '填空': 'blank', '填空题': 'blank', 'blank': 'blank',
  '简答': 'short', '简答题': 'short', 'short': 'short',
}

const LETTERS = 'ABCDEFGH'

/** 中文答案转序号：A→0, B→1 …；多选 "A,C" → "0,2" */
function answerToIndex(answer: string): string {
  const trimmed = answer.trim()
  if (/^[0-9,\s]+$/.test(trimmed)) return trimmed.replace(/\s/g, '')
  return trimmed.split(',').map((part) => {
    const letter = part.trim().toUpperCase()
    const idx = LETTERS.indexOf(letter)
    return idx >= 0 ? String(idx) : part.trim()
  }).sort((a, b) => Number(a) - Number(b)).join(',')
}

/** 判断题答案标准化 */
function normJudge(answer: string): string {
  const v = answer.trim()
  if (['对', '正确', '是', 'true', 'T', '√'].includes(v)) return 'true'
  if (['错', '错误', '否', 'false', 'F', '×'].includes(v)) return 'false'
  return v
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++ }
        else inQuote = false
      } else current += ch
    } else {
      if (ch === '"') inQuote = true
      else if (ch === ',') { cells.push(current); current = '' }
      else current += ch
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

export function parseQuestionCSV(text: string): ParsedQuestion[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('CSV 至少需要标题行和一行数据')
  const questions: ParsedQuestion[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i])
    if (cells.length < 2) continue
    const typeRaw = (cells[0] || '').trim()
    const type = TYPE_MAP[typeRaw] ?? TYPE_MAP[typeRaw.toLowerCase()]
    if (!type) throw new Error(`第 ${i + 1} 行：未知题型「${typeRaw}」，请填 单选/多选/判断/填空/简答`)
    const stem = (cells[1] || '').trim()
    if (!stem) throw new Error(`第 ${i + 1} 行：题干不能为空`)
    const options: string[] = []
    for (let j = 2; j <= 5; j++) {
      const opt = (cells[j] || '').trim()
      if (opt) options.push(opt)
    }
    const answerRaw = (cells[6] || '').trim()
    const score = parseInt((cells[7] || '1').trim(), 10) || 1
    const analysis = (cells[8] || '').trim() || null

    let answer: string | null = null
    if (type === 'single') {
      if (!answerRaw) throw new Error(`第 ${i + 1} 行：单选题必须填答案（A/B/C/D）`)
      answer = answerToIndex(answerRaw)
    } else if (type === 'multiple') {
      if (!answerRaw) throw new Error(`第 ${i + 1} 行：多选题必须填答案（如 A,B,C）`)
      answer = answerToIndex(answerRaw)
      if (options.length < 2) throw new Error(`第 ${i + 1} 行：多选题至少需要 2 个选项`)
    } else if (type === 'judge') {
      if (!answerRaw) throw new Error(`第 ${i + 1} 行：判断题必须填答案（对/错）`)
      answer = normJudge(answerRaw)
    } else if (type === 'blank') {
      if (!answerRaw) throw new Error(`第 ${i + 1} 行：填空题必须填标准答案`)
      answer = answerRaw
    }
    // short: no answer needed

    questions.push({ type, stem, options: options.length ? options : null, answer, analysis, score })
  }
  if (!questions.length) throw new Error('未解析到有效题目行')
  if (questions.length > MAX_IMPORT_QUESTIONS) throw new Error(`最多 ${MAX_IMPORT_QUESTIONS} 题，当前 ${questions.length} 题`)
  return questions
}

export function generateTemplateCSV(): string {
  const rows = [
    '题型,题干,选项A,选项B,选项C,选项D,答案,分值,解析',
    '单选,OSI 参考模型共有几层?,4 层,5 层,7 层,9 层,C,2,经典网络基础题',
    '多选,下列哪些是传输层协议?,TCP,UDP,ICMP,ARP,"A,B",3,至少选两项',
    '判断,TCP 是面向连接的可靠传输协议,,,,对,1,',
    '填空,IPv4 地址由 ___ 位二进制组成,,,,32,2,',
    '简答,请简述 TCP 三次握手的过程及每次握手的作用。,,,,,10,考查连接建立理解',
  ]
  return '\uFEFF' + rows.join('\r\n') + '\r\n'
}

export function downloadTemplate() {
  const blob = new Blob([generateTemplateCSV()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '随堂练习题目模板.csv'
  a.click()
  URL.revokeObjectURL(url)
}

async function readUtf8(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    throw new Error('文件必须使用 UTF-8 编码')
  }
}

export async function readClassroomQuestionImportFile(
  file: File,
): Promise<{ text: string; questionCount: number; questions: ParsedQuestion[]; format: 'csv' | 'json' }> {
  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  if (!['csv', 'json'].includes(extension)) throw new Error('仅支持 .csv 或 .json 文件')
  if (file.size < 1 || file.size > MAX_IMPORT_BYTES) throw new Error('文件大小必须在 10MiB 以内')

  const text = await readUtf8(file)
  if (extension === 'csv') {
    const questions = parseQuestionCSV(text)
    return { text, questionCount: questions.length, questions, format: 'csv' }
  }
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('JSON 文件格式无效') }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_IMPORT_QUESTIONS) {
    throw new Error(`JSON 顶层必须是 1 至 ${MAX_IMPORT_QUESTIONS} 个题目对象的数组`)
  }
  const questions = parsed.map((q: Record<string, unknown>) => ({
    type: String(q.type ?? ''),
    stem: String(q.stem ?? ''),
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    answer: q.answer != null ? String(q.answer) : null,
    analysis: q.analysis != null ? String(q.analysis) : null,
    score: Number(q.score ?? 1) || 1,
  }))
  return { text, questionCount: questions.length, questions, format: 'json' }
}
