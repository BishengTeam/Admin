import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form, message } from 'antd'
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
  it('shows the server storage failure and preserves the previous template for retry', async () => {
    const previous = { filename: `commitment_${'b'.repeat(64)}.pdf`, sha256: 'b'.repeat(64), original_filename: '当前承诺书.pdf' }
    const error = vi.spyOn(message, 'error').mockImplementation(() => (() => undefined) as ReturnType<typeof message.error>)
    vi.mocked(rensheService.uploadCommitmentTemplate).mockRejectedValueOnce(new Error('承诺书模板存储不可用，请联系管理员检查目录权限和持久化配置'))
    const changed = vi.fn()
    const { container } = render(<ExportInstructions instructions={instructions} required={false} readOnly={false} commitmentTemplate={previous} onCommitmentTemplateChange={changed} />)
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['%PDF-1.4 fixture'], '替换.pdf', { type: 'application/pdf' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('承诺书模板存储不可用，请联系管理员检查目录权限和持久化配置')
    expect(changed).not.toHaveBeenCalled()
    expect(screen.getByText('当前承诺书.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /上传替换/ })).not.toBeDisabled()
    error.mockRestore()
  })
  it('uploads the business template without asking for export settings or confirmations', async () => {
    const metadata = { filename: `commitment_${'a'.repeat(64)}.pdf`, sha256: 'a'.repeat(64), original_filename: '甲方承诺书.pdf', size_bytes: 16 }
    vi.mocked(rensheService.uploadCommitmentTemplate).mockResolvedValue(metadata)
    const submitted = vi.fn()
    let commitment: unknown
    const { container } = render(<Form onFinish={submitted}>
      <ExportInstructions instructions={instructions} required readOnly={false} onCommitmentTemplateChange={value => { commitment = value }} />
      <button type='submit'>保存项目</button>
    </Form>)
    const file = new File(['%PDF-1.4 fixture'], '甲方承诺书.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
    await waitFor(() => expect(commitment).toEqual(metadata))
    expect(rensheService.uploadCommitmentTemplate).toHaveBeenCalledWith(file)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByLabelText('报送口径版本')).toBeNull()
    expect(screen.queryByText('切换第二版')).toBeNull()
    fireEvent.click(screen.getByText('保存项目'))
    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(commitment).toEqual(metadata)
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
    render(<ExportInstructions instructions={instructions} required={false} readOnly commitmentTemplate={template} />)
    expect(screen.getByText('当前承诺书.pdf')).toBeTruthy()
    expect(screen.getByRole('button', { name: /上传替换/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /下载当前模板/ })).not.toBeDisabled()
  })
})
