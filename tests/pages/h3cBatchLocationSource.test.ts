import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(),
  'src/pages/certification/components/vendors/h3c/BatchOverrides.tsx'), 'utf8')

describe('H3C batch exam location source', () => {
  it('keeps exam location in exam schedule management instead of the batch form', () => {
    expect(source).not.toContain("name='exam_location'")
    expect(source).not.toContain('exam_location: values.exam_location')
    expect(source).not.toContain('watchExamLocation')
    expect(source).not.toContain('batch.exam_location')
    expect(source).toContain('考试地点在「考场管理」中设置，此处无需填写')
    expect(source).toContain("children: '以考生预约为准'")
  })
})
