import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('H3C exam schedule management', () => {
  it('unwraps response interceptor payloads and paginated list payloads', () => {
    const source = readFile(
      'src/pages/certification/components/vendors/h3c/ExamSchedule/index.tsx',
    )

    expect(source).toContain('function normalizeList<T>')
    expect(source).toContain('setSchedules(normalizeList<Schedule>(')
    expect(source).not.toContain('setSchedules(res.data')
    expect(source).toContain('setDetail(res as unknown as ScheduleDetail)')
    expect(source).not.toContain('setDetail(res.data)')
  })

  it('previews Friday dates while excluding configured holidays', () => {
    const source = readFile(
      'src/pages/certification/components/vendors/h3c/ExamSchedule/index.tsx',
    )

    expect(source).toContain('function generateBookableFridays')
    expect(source).toContain("current.day() === 5")
    expect(source).toContain("!holidays.has(current.format('YYYY-MM-DD'))")
    expect(source).toContain('该范围内可预约日期（仅周五，排除假期）')
    expect(source).toContain('无可用日期')
  })
})
