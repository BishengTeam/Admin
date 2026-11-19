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
    expect(source).toContain('certProductService.list({ type: vendor, page: 1, page_size: 100 })')
    expect(source).toContain('name=\'product_ids\'')
    expect(source).toContain('<Form.List')
    expect(source).toContain('shared_quotas: slotConfigs.map')
    expect(source).toContain('exam_location: values.exam_location')
    expect(source).toContain("name='exam_location'")
    expect(source).toContain('如：成都市高新区天府软件园B区3楼')
    expect(source).toContain('publish,')
    expect(source).toContain('保存草稿')
    expect(source).toContain('保存并发布')
    expect(source).not.toContain('{ value: 1, label: \'H3CNE\' }')
    expect(source).not.toContain('quotaKey')
  })

  it('previews bookable dates for selected weekdays while excluding holidays', () => {
    const source = readComponent()

    expect(source).toContain('function generateBookableDates')
    expect(source).toContain('exam_location?: string')
    expect(source).toContain('const pythonWeekday = (current.day() + 6) % 7')
    expect(source).toContain('enabled.has(pythonWeekday)')
    expect(source).not.toContain('enabled.has(current.day())')
    expect(source).toContain("!holidays.has(current.format('YYYY-MM-DD'))")
    expect(source).toContain('该范围内可预约日期（排除假期）')
    expect(source).toContain('当前无可预约日期')
  })

  it('uses one shared pool per time slot and keeps post-publication guardrails', () => {
    const source = readComponent()

    expect(source).toContain('④ 考位配额（所有科目共享）')
    expect(source).toContain('同一时段所有科目共享机位，先到先得')
    expect(source).toContain('shared_quotas: items')
    expect(source).toContain('slot_start: string')
    expect(source).toContain('const canEdit = detail.status !== \'closed\'')
    expect(source).toContain('已约 {booked}')
    expect(source).toContain('发布后可将限量调整为不低于该时段已约人数')
    expect(source).not.toContain('subject_id')
  })

  it('reuses the workbench for Sangfor schedules without seat quotas', () => {
    const source = readComponent()

    expect(source).toContain("const vendor = type === 'sangfor' ? 'sangfor' : 'h3c'")
    expect(source).toContain('const quotaEnabled = vendor !== \'sangfor\'')
    expect(source).toContain('深信服考试不设机位配额')
    expect(source).toContain('vendor,')
    expect(source).toContain('api.list(vendor)')
    expect(source).toContain("'/admin/cert-attachments'")
    expect(source).toContain('<AttachmentManager')
    expect(source).toContain('配套附件')
  })
})
