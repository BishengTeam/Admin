import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form } from 'antd'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { GraduatedExportConfig } from '@/pages/certification/components/vendors/renshe/GraduatedConfig'
import { rensheService } from '@/services/renshe'

vi.mock('@/services/renshe', () => ({ rensheService: { uploadCommitmentTemplate: vi.fn(), downloadCommitmentTemplate: vi.fn() } }))
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
})
afterEach(cleanup)

describe('人社承诺书模板', () => {
  const condition = '取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。'
  const defaults = { contract_version: 2, version: 'registration-v2', confirmed_by_client: false, export_values: { candidate_source: '社会人员', application_condition: condition }, employment_reporting: { confirmed: false, date_rule: null, years_rule: null, allow_zero_years: null } }
  it('uploads a new immutable template and clears the old confirmation', async () => {
    const metadata = { filename: `commitment_${'a'.repeat(64)}.pdf`, sha256: 'a'.repeat(64), original_filename: '甲方承诺书.pdf' }
    vi.mocked(rensheService.uploadCommitmentTemplate).mockResolvedValue(metadata)
    const submitted = vi.fn()
    const { container } = render(<Form initialValues={{ config: { reporting_policy: { confirmed_by_client: true } } }} onFinish={submitted}>
      <GraduatedExportConfig required={false} readOnly={false} materials={[]} />
      <button type='submit'>保存测试配置</button>
    </Form>)
    const file = new File(['%PDF-1.4 fixture'], '甲方承诺书.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
    await screen.findByText('甲方承诺书.pdf')
    expect(rensheService.uploadCommitmentTemplate).toHaveBeenCalledWith(file)
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByText('保存测试配置'))
    await waitFor(() => expect(submitted).toHaveBeenCalled())
    const config = submitted.mock.calls[0][0].config
    expect(config.reporting_policy.commitment_template.sha256).toBe(metadata.sha256)
    expect(config.reporting_policy.confirmed_by_client).toBe(false)
  })

  it('upgrades old reporting fields without retaining the obsolete graduation-status column', async () => {
    const submitted = vi.fn()
    const metadata = { filename: `commitment_${'b'.repeat(64)}.pdf`, sha256: 'b'.repeat(64) }
    render(<Form initialValues={{ config: { reporting_policy: { version: 'old-v1', confirmed_by_client: true, commitment_template: metadata, attachment_names: { commitment_letter: '承诺书' }, export_values: { candidate_source: '社会人员', student_status: '已毕业', application_condition: '毕业证书' } } } }} onFinish={submitted}>
      <GraduatedExportConfig required={false} readOnly={false} materials={[]} defaultPolicy={defaults} />
      <button type='submit'>保存第二版</button>
    </Form>)
    fireEvent.click(screen.getByRole('button', { name: '切换第二版' }))
    expect(screen.getByLabelText('U列学历型申报条件（模板原文）')).toHaveValue(condition)
    expect(screen.getByLabelText('U列学历型申报条件（模板原文）')).toBeDisabled()
    expect(screen.getByLabelText('F列考生来源')).toHaveValue('社会人员')
    fireEvent.click(screen.getByText('保存第二版'))
    await waitFor(() => expect(submitted).toHaveBeenCalled())
    const policy = submitted.mock.calls[0][0].config.reporting_policy
    expect(policy.contract_version).toBe(2)
    expect(policy.export_values).toEqual(defaults.export_values)
    expect(policy.commitment_template).toEqual(metadata)
    expect(policy.employment_reporting.confirmed).toBe(false)
    expect(policy.confirmed_by_client).toBe(false)
  })

  it('clears the R/S confirmation when a date rule changes and preserves an explicit false zero-year choice', async () => {
    const submitted = vi.fn()
    render(<Form initialValues={{ config: { reporting_policy: { ...defaults, employment_reporting: { confirmed: true, date_rule: 'work_only', years_rule: 'required', allow_zero_years: false } } } }} onFinish={submitted}>
      <GraduatedExportConfig required={false} readOnly={false} materials={[]} defaultPolicy={defaults} />
      <button type='submit'>保存报送规则</button>
    </Form>)
    fireEvent.mouseDown(screen.getByLabelText('R列日期填报规则'))
    fireEvent.click(screen.getByText('必须填入学日期'))
    expect(screen.getByRole('checkbox', { name: /R、S列规则已获甲方确认/ })).not.toBeChecked()
    fireEvent.click(screen.getByText('保存报送规则'))
    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(submitted.mock.calls[0][0].config.reporting_policy.employment_reporting).toEqual({ confirmed: false, date_rule: 'enrollment_only', years_rule: 'required', allow_zero_years: false })
  })
})
