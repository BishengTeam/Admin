import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectTable from '@/pages/certification/components/vendors/renshe/ProjectTable'
import { rensheService } from '@/services/renshe'
import type { RensheCapabilities, RensheProject } from '@/types/rensheProject'

vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: () => <div>封面上传</div> }))
vi.mock('@/services/renshe', () => ({ rensheService: { listProjects: vi.fn(), projectCapabilities: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(), uploadCommitmentTemplate: vi.fn(), downloadCommitmentTemplate: vi.fn() } }))

const currentMaterials = [
  { kind: 'id_card_front', name: '身份证正面', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  { kind: 'id_card_back', name: '身份证背面', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  { kind: 'portrait', name: '人像照片（二寸免冠照片）', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  { kind: 'social_security_proof', name: '社保缴费证明', required: true, extensions: ['.pdf'], max_count: 1 },
  { kind: 'xuexin_registration', name: '学信网电子注册表', required: true, extensions: ['.pdf'], max_count: 1 },
  { kind: 'education_proof', name: '学历证明', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  { kind: 'vocational_qualification_certificate', name: '职业资格证书', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  { kind: 'professional_title_certificate', name: '职称证书', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  { kind: 'commitment_letter', name: '承诺书', required: true, extensions: ['.jpg', '.jpeg', '.pdf'], max_count: 1 },
]
const currentConfig: RensheProject['config'] = {
  occupation_name: '信息安全管理员', occupation_code: '4-04-04-02', skill_level: '中级工', export_skill_level: '四级',
  exam_types: ['新考'], application_types: ['学历型'], qualification_rule: 'related_major_graduated_degree_v1',
  education_levels: ['secondary_vocational', 'technical_school', 'vocational_high', 'higher_vocational', 'associate', 'bachelor', 'master', 'doctorate'],
  form_fields: ['contact_phone', 'mailing_address', 'email'], materials: currentMaterials,
  export_template: 'renshe_graduated_v1', field_mapping: {}, attachment_layout: 'flat',
  institution_types: ['technical', 'vocational', 'general_higher'], reporting_policy: { contract_version: 2 },
  commitment_template: null,
}
const legacyConfig: RensheProject['config'] = {
  ...currentConfig,
  qualification_rule: 'related_major_current_graduating_student',
  education_levels: ['bachelor'],
  materials: [{ kind: 'student_card', name: '学生证', required: true, extensions: ['.jpg'], max_count: 1 }],
  export_template: 'renshe_registration_v1', attachment_layout: 'by_candidate',
  institution_types: undefined, reporting_policy: undefined,
}
const project: RensheProject = { id: 1, code: 'RS-INTERNAL', chinese_name: '信息安全中级项目', description: '', home_cover_url: null, status: 'available', config_id: 10, version: 1, config: legacyConfig, validation_errors: [], batch_count: 2 }
const capabilities: RensheCapabilities = {
  default_config: currentConfig,
  templates: { current: { label: '当前固定25列报名信息模板', columns: ['real_name', 'id_card_number'] } },
  material_names: Object.fromEntries(currentMaterials.map(item => [item.kind, item.name])),
  form_fields: currentConfig.form_fields,
  qualification_rules: { related_major_current_graduating_student: '历史规则', related_major_graduated_degree_v1: '已毕业学历型' },
  admission_requirements: {
    scope: {
      occupation_name: '信息安全管理员', occupation_code: '4-04-04-02', skill_level: '中级工', export_skill_level: '四级',
      application_types: ['学历型'], exam_types: ['新考'], qualification_rule: 'related_major_graduated_degree_v1',
    },
    form_sections: ['本人实名信息', '毕业学历信息', '联系信息', '报送模板要求的其他实际信息'],
    education_options: [{ value: 'bachelor', label: '大学本科' }],
    institution_types: [{ value: 'general_higher', label: '普通高等学校' }],
    materials: currentMaterials.map(item => ({ ...item, max_size_bytes: 10 * 1024 * 1024 })),
    notes: ['文化程度选项用于如实填报，不代表自动符合资格。'],
  },
}

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
  it('shows read-only requirements and saves legacy projects with current rules', async () => {
    const template = { filename: `commitment_${'c'.repeat(64)}.pdf`, sha256: 'c'.repeat(64), original_filename: '确认承诺书.pdf' }
    vi.mocked(rensheService.uploadCommitmentTemplate).mockResolvedValue(template)
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    expect(await screen.findByText('报考要求（只读）')).toBeTruthy()
    expect(screen.getByText(/文化程度为如实填报选项/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /上传承诺书模板/ })).toBeTruthy()
    expect(screen.queryByLabelText('资格校验规则')).toBeNull()
    expect(screen.queryByLabelText('支持的考试类型')).toBeNull()
    expect(screen.queryByLabelText('允许的文化程度')).toBeNull()
    expect(screen.queryByRole('checkbox', { name: /必填/ })).toBeNull()
    fireEvent.change(screen.getByRole('dialog').querySelector('input[type=file]')!, { target: { files: [new File(['%PDF-1.4 fixture'], '确认承诺书.pdf', { type: 'application/pdf' })] } })
    await screen.findByText('确认承诺书.pdf')
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    await waitFor(() => expect(rensheService.updateProject).toHaveBeenCalledTimes(1))
    const [id, payload] = vi.mocked(rensheService.updateProject).mock.calls[0]
    expect(id).toBe(project.id)
    expect(payload.config?.qualification_rule).toBe('related_major_graduated_degree_v1')
    expect(payload.config?.materials).toEqual(currentMaterials)
    expect(payload.config?.commitment_template).toEqual(template)
  })

  it('creates a project from backend defaults without technical identifiers', async () => {
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    fireEvent.click(screen.getByRole('button', { name: /新增项目/ }))
    const name = await screen.findByLabelText('项目名称')
    fireEvent.change(name, { target: { value: '新报考项目' } })
    expect(screen.queryByLabelText('产品编码')).toBeNull()
    expect(screen.queryByLabelText('职业／工种')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    await waitFor(() => expect(rensheService.createProject).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(rensheService.createProject).mock.calls[0][0]
    expect(payload.chinese_name).toBe('新报考项目')
    expect(payload.status).toBe('draft')
    expect(payload).not.toHaveProperty('code')
    expect(payload.config).toEqual(currentConfig)
  })

  it('shows the server validation reason and keeps the editor open', async () => {
    vi.mocked(rensheService.updateProject).mockRejectedValue(new Error('导出模板需要适配'))
    render(<MemoryRouter><ProjectTable /></MemoryRouter>)
    await screen.findByText('信息安全中级项目')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    const template = { filename: `commitment_${'d'.repeat(64)}.pdf`, sha256: 'd'.repeat(64), original_filename: '确认承诺书.pdf' }
    vi.mocked(rensheService.uploadCommitmentTemplate).mockResolvedValue(template)
    fireEvent.change(screen.getByRole('dialog').querySelector('input[type=file]')!, { target: { files: [new File(['%PDF-1.4 fixture'], '确认承诺书.pdf', { type: 'application/pdf' })] } })
    await screen.findByText('确认承诺书.pdf')
    fireEvent.click(screen.getByRole('button', { name: '保 存' }))
    expect(await screen.findByText('导出模板需要适配')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
