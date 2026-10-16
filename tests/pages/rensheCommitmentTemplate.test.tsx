import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form } from 'antd'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ExportInstructions } from '@/pages/certification/components/vendors/renshe/ExportInstructions'
import { rensheService } from '@/services/renshe'

vi.mock('@/services/renshe', () => ({ rensheService: { uploadCommitmentTemplate: vi.fn(), downloadCommitmentTemplate: vi.fn(), downloadRegistrationTemplate: vi.fn() } }))
beforeAll(() => {
  const getComputedStyle = window.getComputedStyle
  window.getComputedStyle = element => getComputedStyle(element)
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
})
afterEach(cleanup)
const instructions = { registration_template: '报名信息.xlsx', work_template: '工作经历.xlsx', work_description: '原样附带甲方工作经历模板，不会自动填写经历。', directory_note: '目录示例，实际内容以报名材料为准', portrait_note: '保留真实扩展名', example_paths: [], file_tree: '人社报名_批次名称.zip\n└─ 报名信息.xlsx', columns: [{ column: 18, header: '参加工作日期（入学日期）', source: '使用真实参加工作日期，格式2022-9-21' }] }

describe('人社导出说明和承诺书', () => {
  it('uploads the business template without asking for export settings or confirmations', async () => {
    const metadata = { filename: `commitment_${'a'.repeat(64)}.pdf`, sha256: 'a'.repeat(64), original_filename: '甲方承诺书.pdf' }
    vi.mocked(rensheService.uploadCommitmentTemplate).mockResolvedValue(metadata)
    const submitted = vi.fn()
    const { container } = render(<Form onFinish={submitted}>
      <ExportInstructions instructions={instructions} required readOnly={false} />
      <button type='submit'>保存项目</button>
    </Form>)
    const file = new File(['%PDF-1.4 fixture'], '甲方承诺书.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
    await screen.findByText('甲方承诺书.pdf')
    expect(rensheService.uploadCommitmentTemplate).toHaveBeenCalledWith(file)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByLabelText('报送口径版本')).toBeNull()
    expect(screen.queryByText('切换第二版')).toBeNull()
    fireEvent.click(screen.getByText('保存项目'))
    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(submitted.mock.calls[0][0].config).toEqual({ commitment_template: metadata })
  })

  it('renders server-provided directory and read-only field instructions', async () => {
    render(<Form><ExportInstructions instructions={instructions} required={false} readOnly={false} /></Form>)
    expect(screen.getByText(instructions.directory_note)).toBeTruthy()
    expect(screen.getByText(/原样附带甲方工作经历模板/)).toBeTruthy()
    expect(screen.getByText(/人社报名_批次名称.zip/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看字段填写说明' }))
    expect(await screen.findByText('使用真实参加工作日期，格式2022-9-21')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('shows the existing file for download while upload is read-only', () => {
    const template = { filename: `commitment_${'b'.repeat(64)}.pdf`, sha256: 'b'.repeat(64), original_filename: '当前承诺书.pdf' }
    render(<Form initialValues={{ config: { commitment_template: template } }}><ExportInstructions instructions={instructions} required={false} readOnly /></Form>)
    expect(screen.getByText('当前承诺书.pdf')).toBeTruthy()
    expect(screen.getByRole('button', { name: /上传替换/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /下载当前模板/ })).not.toBeDisabled()
  })
})
