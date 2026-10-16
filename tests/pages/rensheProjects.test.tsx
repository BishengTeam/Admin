import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectTable from '@/pages/certification/components/vendors/renshe/ProjectTable'
import { rensheService } from '@/services/renshe'
import type { RensheCapabilities, RensheProject } from '@/types/rensheProject'

vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: () => <div>封面上传</div> }))
vi.mock('@/services/renshe', () => ({ rensheService: { listProjects: vi.fn(), projectCapabilities: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(), uploadCommitmentTemplate: vi.fn(), downloadCommitmentTemplate: vi.fn() } }))

const config: RensheProject['config'] = {
  occupation_name: '信息安全管理员', occupation_code: '4-04-04-02', skill_level: '中级工', export_skill_level: '四级',
  exam_types: ['新考'], application_types: ['学历型'], qualification_rule: 'related_major_current_graduating_student', education_levels: ['bachelor'],
  form_fields: ['contact_phone', 'mailing_address', 'email'], materials: [{ kind: 'student_card', name: '学生证', required: true, extensions: ['.jpg'], max_count: 1 }],
  export_template: 'renshe_registration_v1', field_mapping: {}, attachment_layout: 'by_candidate',
}
const project: RensheProject = { id: 1, code: 'RS-INTERNAL', chinese_name: '信息安全中级项目', description: '', home_cover_url: null, status: 'available', config_id: 10, version: 1, config, validation_errors: [], batch_count: 2 }
const capabilities: RensheCapabilities = { default_config: config, templates: { renshe_registration_v1: { label: '报名信息', columns: ['real_name', 'id_card_number'] } }, material_names: { student_card: '学生证' }, form_fields: config.form_fields, qualification_rules: { related_major_current_graduating_student: '在读应届学生（人工审核）' } }

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  const getComputedStyle = window.getComputedStyle
  window.getComputedStyle = element => getComputedStyle(element)
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rensheService.listProjects).mockResolvedValue([project])
  vi.mocked(rensheService.projectCapabilities).mockResolvedValue(capabilities)
  vi.mocked(rensheService.createProject).mockResolvedValue({ ...project, status: 'draft' })
  vi.mocked(rensheService.updateProject).mockResolvedValue(project)
})
afterEach(cleanup)

describe('人社报考项目管理', () => {
  it('shows commitment upload directly for legacy projects without changing admission rules', async () => {
    const template = { filename: `commitment_${'c'.repeat(64)}.pdf`, sha256: 'c'.repeat(64), original_filename: '确认承诺书.pdf' }
    vi.mocked(rensheService.uploadCommitmentTemplate).mockResolvedValue(template)
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    fireEvent.click(await screen.findByRole('tab', { name: '导出说明' }))
    expect(screen.getByRole('button', { name: /上传承诺书模板/ })).toBeTruthy()
    expect(screen.queryByLabelText('已适配导出模板')).toBeNull()
    expect(screen.queryByLabelText('附件目录与命名规则')).toBeNull()
    fireEvent.change(screen.getByRole('dialog').querySelector('input[type=file]')!, { target: { files: [new File(['%PDF-1.4 fixture'], '确认承诺书.pdf', { type: 'application/pdf' })] } })
    await screen.findByText('确认承诺书.pdf')
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    await waitFor(() => expect(rensheService.updateProject).toHaveBeenCalledTimes(1))
    const [id, payload] = vi.mocked(rensheService.updateProject).mock.calls[0]
    expect(id).toBe(project.id)
    expect(payload.config.qualification_rule).toBe(config.qualification_rule)
    expect(payload.config.commitment_template).toEqual(template)
    expect(payload.config.materials).toEqual(config.materials)
  })

  it('shows a business-name table and saves a draft without manually entered technical identifiers', async () => {
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    expect(screen.queryByText('RS-INTERNAL')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /新增项目/ }))
    const name = await screen.findByLabelText('项目名称')
    fireEvent.change(name, { target: { value: '新报考项目' } })
    expect(screen.queryByLabelText('产品编码')).toBeNull()
    expect(screen.queryByLabelText('英文名')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    await waitFor(() => expect(rensheService.createProject).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(rensheService.createProject).mock.calls[0][0]
    expect(payload.chinese_name).toBe('新报考项目')
    expect(payload.status).toBe('draft')
    expect(payload).not.toHaveProperty('code')
    expect(payload.config.materials).toEqual(config.materials)
    expect(payload.config.export_template).toBe(config.export_template)
  })

  it('keeps the entire configuration across tabs and submits the expected version', async () => {
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    const name = await screen.findByLabelText('项目名称')
    fireEvent.change(name, { target: { value: '新的展示名称' } })
    fireEvent.click(screen.getByRole('tab', { name: '报名规则与材料' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '学生证必填' }))
    fireEvent.click(screen.getByRole('tab', { name: '导出说明' }))
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    await waitFor(() => expect(rensheService.updateProject).toHaveBeenCalledTimes(1))
    const [id, payload] = vi.mocked(rensheService.updateProject).mock.calls[0]
    expect(id).toBe(1)
    expect(payload.expected_version).toBe(1)
    expect(payload.chinese_name).toBe('新的展示名称')
    expect(payload.config.materials[0].required).toBe(false)
    expect(payload.config.occupation_name).toBe(config.occupation_name)
    expect(payload.config.form_fields).toEqual(config.form_fields)
  })

  it('shows the server validation reason and keeps the editor open', async () => {
    vi.mocked(rensheService.updateProject).mockRejectedValue(new Error('导出模板需要适配'))
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    await screen.findByLabelText('项目名称')
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    expect(await screen.findByText('导出模板需要适配')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
