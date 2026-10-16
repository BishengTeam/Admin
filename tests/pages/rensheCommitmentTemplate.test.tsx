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
})
