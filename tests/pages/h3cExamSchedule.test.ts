import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readComponent = () => readFileSync(resolve(process.cwd(),
  'src/pages/certification/components/vendors/h3c/ExamSchedule/index.tsx'), 'utf8')

describe('H3C exam schedule management', () => {
  it('unwraps response interceptor payloads and paginated list payloads', () => {
    const source = readComponent()

    expect(source).toContain('function normalizeList<T>')
    expect(source).toContain('setSchedules(normalizeList<Schedule>(')
    expect(source).not.toContain('setSchedules(res.data')
    expect(source).toContain('setDetail(res as unknown as ScheduleDetail)')
    expect(source).not.toContain('setDetail(res.data)')
  })

  it('creates schedules in one composite request', () => {
    const source = readComponent()

    expect(source).toContain("const DEFAULT_SLOT_TIMES = ['09:30', '11:30', '14:30', '16:30']")
    expect(source).toContain("certProductService.list({ type: 'h3c', page: 1, page_size: 100 })")
    expect(source).toContain('name=\'product_ids\'')
    expect(source).toContain('<Form.List')
    expect(source).toContain('seat_quotas: productsForPayload.flatMap')
    expect(source).toContain('publish,')
    expect(source).toContain('保存草稿')
    expect(source).toContain('保存并发布')
    expect(source).not.toContain('{ value: 1, label: \'H3CNE\' }')
  })

  it('previews bookable dates for selected weekdays while excluding holidays', () => {
    const source = readComponent()

    expect(source).toContain('function generateBookableDates')
    expect(source).toContain('enabled.has(current.day())')
    expect(source).toContain("!holidays.has(current.format('YYYY-MM-DD'))")
    expect(source).toContain('该范围内可预约日期（排除假期）')
    expect(source).toContain('当前无可预约日期')
  })

  it('keeps quota adjustments available after publication with booked-count guardrails', () => {
    const source = readComponent()

    expect(source).toContain('const canEdit = detail.status !== \'closed\'')
    expect(source).toContain('已约 {booked}')
    expect(source).toContain('发布后可将限量调整为不低于已约人数')
  })
})
