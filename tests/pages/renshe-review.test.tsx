import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { RensheApplicationDetail, RensheApplicationVersion, RensheReview, RensheReviewRequirements } from '@/types/renshe'
import ApplicationDetailDrawer from '@/pages/certification/components/vendors/renshe/ApplicationDetailDrawer'
import ApplicationHistory, { ReviewRecords } from '@/pages/certification/components/vendors/renshe/ApplicationHistory'
import ApplicationReviewContent, { SnapshotFields } from '@/pages/certification/components/vendors/renshe/ApplicationReviewContent'

const mocks = vi.hoisted(() => ({ get: vi.fn(), signed: vi.fn(), review: vi.fn() }))
vi.mock('@/services/renshe', () => ({ rensheService: { getApplication: mocks.get, getMaterialSignedUrl: mocks.signed, reviewApplication: mocks.review } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ admin: { role: 'cert_admin' } }) }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
const req: RensheReviewRequirements = {
  status: 'resolved', version_id: 11, project_config_id: 1, block_reason: null,
  path: { id: 'title_work_1', occupation: '信息安全管理员', level: '高级工', application_type: '复合型', label: '初级职称后工作满1年', condition: '取得初级职称后累计相关工作满1年' },
  groups: [{ id: 'identity', title: '身份信息', field_paths: ['realname_snapshot'] }, { id: 'title', title: '职称证书及网查材料', field_paths: [] }, { id: 'extra', title: '其他已提交材料', field_paths: [] }],
  checks: [{ key: 'identity', label: '身份一致', description: '证件属于本人', group_id: 'identity', related_material_kinds: ['professional_title_certificate'], related_field_paths: [] }, { key: 'title', label: '职称证书及网查', description: '初级职称取得时间与岗位符合要求', group_id: 'title', related_material_kinds: ['professional_title_certificate'], related_field_paths: [] }],
  material_requirements: [{ kind: 'professional_title_certificate', name: '职称证书', required: true, extensions: ['.jpg'], group_id: 'title', material_id: 1, valid: true, max_bytes: 102400, error: null }],
  correction_fields: ['email'], references: [], source_notes: [],
}
function version(id = 11): RensheApplicationVersion {
  return { id, application_id: 1, version_no: id === 11 ? 1 : 2, project_config_id: 1, submitted_at: '2026-10-23T01:00:00Z', sensitive_cleared_at: null,
    realname_snapshot: { real_name: '张三', user_type: 'social' }, student_snapshot: {}, form_data: {}, reviews: [],
    review_requirements: { ...structuredClone(req), version_id: id }, materials: [
      { id: 1, application_id: 1, version_id: id, sha256: 'a'.repeat(64), deleted_at: null, kind: 'professional_title_certificate', original_filename: 'random-hidden.jpg', content_type: 'image/jpeg', size_bytes: 100, is_deleted: false },
      { id: 2, application_id: 1, version_id: id, sha256: 'b'.repeat(64), deleted_at: null, kind: 'unrecognized-proof', original_filename: 'random-hidden.pdf', content_type: 'application/pdf', size_bytes: 120, is_deleted: false },
    ] } as RensheApplicationVersion
}
function detail(id = 1, current = version()): RensheApplicationDetail {
  return { id, plan_id: 1, status: 'pending_initial_review', current_version_id: current.id, frozen_at: null,
    payment_summary: { order_id: 1, payment_channel: 'wechat', order_status: 'paid', review_payment_allowed: true },
    plan: { id: 1, name: '测试批次', occupation_name: '信息安全管理员', skill_level: '高级工', application_type: '复合型' }, versions: [current] } as RensheApplicationDetail
}
beforeEach(() => {
  mocks.get.mockReset(); mocks.review.mockReset(); mocks.signed.mockReset()
  mocks.signed.mockResolvedValue({ url: '/private-test.jpg', expires_in: 300 })
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('uses field-specific Chinese values and folds unknown fields without changing free text', () => {
  render(<SnapshotFields value={{ user_type: 'social', school: 'social', education: 'unrecognized', unknown_key: 'legacy' }} />)
  expect(screen.getByText('社会人员')).toBeTruthy()
  expect(screen.getByText('social')).toBeTruthy()
  expect(screen.getByText('未知类型')).toBeTruthy()
  expect(screen.queryByText(/unknown_key/)).toBeNull()
  fireEvent.click(screen.getByText('兼容信息'))
  expect(screen.getByText(/unknown_key/)).toBeTruthy()
})

it('shows actual path checks once, keeps unknown proofs, and hides raw filenames', () => {
  render(<ApplicationReviewContent version={version()} checks={[]} editable onCheck={() => {}} />)
  expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  expect(screen.getByText('其他材料 1')).toBeTruthy()
  expect(screen.queryByText('random-hidden.pdf')).toBeNull()
  expect(screen.queryByText('random-hidden.jpg')).toBeNull()
  expect(screen.queryByText('毕业学历及核验材料')).toBeNull()
  expect(mocks.signed).not.toHaveBeenCalled()
})

it('history stays collapsed and readonly; old reviews never invent a denominator', () => {
  const historical = version()
  render(<ApplicationHistory versions={[historical]} />)
  expect(screen.queryByText('证件属于本人')).toBeNull()
  fireEvent.click(screen.getByText(/历史版本 1/))
  expect(screen.getByText('证件属于本人')).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
  cleanup()
  const base = { id: 1, stage: 'initial', decision: 'approved', reviewer_id: 1, reviewed_at: '2026-10-23T01:00:00Z' }
  render(<ReviewRecords reviews={[
    { ...base, checklist: { identity: true } },
    { ...base, id: 2, checklist: null },
    { ...base, id: 3, checklist: { identity: true, title: true }, checklist_snapshot: { version_id: 11, project_config_id: 1, path: req.path, checks: req.checks } },
  ] as RensheReview[]} />)
  expect(screen.getByText('已核验 1 项')).toBeTruthy()
  expect(screen.getByText('未记录逐项核验')).toBeTruthy()
  expect(screen.getByText('已核验 2/2 项')).toBeTruthy()
})

it('binds checks to the current definition and version, preserving same-version tab and refresh actions', async () => {
  let current = detail()
  mocks.get.mockImplementation(async () => structuredClone(current))
  const props = { applicationId: 1, open: true, onClose: () => {} }
  const draw = (open = true) => <MemoryRouter><ApplicationDetailDrawer {...props} open={open} /></MemoryRouter>
  const view = render(draw())
  const identity = await screen.findByRole('checkbox', { name: '身份一致' })
  fireEvent.click(identity)
  expect(screen.getByText('已核验 1/2 项，尚有 1 项')).toBeTruthy()
  expect(screen.getByRole('button', { name: '初审通过' })).toBeDisabled()
  fireEvent.click(screen.getByRole('tab', { name: '① 核账' }))
  fireEvent.click(screen.getByRole('tab', { name: '② 报名审核' }))
  expect(screen.getByRole('checkbox', { name: '身份一致' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: '刷 新' }))
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: '身份一致' })).toBeChecked())
  fireEvent.click(screen.getByRole('checkbox', { name: '职称证书及网查' }))
  expect(screen.getByRole('button', { name: '初审通过' })).toBeEnabled()
  current.versions[0].review_requirements!.checks[0].description = '核验定义已更新'
  fireEvent.click(screen.getByRole('button', { name: '刷 新' }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: '身份一致' })).not.toBeChecked())
  fireEvent.click(screen.getByRole('checkbox', { name: '身份一致' }))
  current = detail(1, version(12))
  fireEvent.click(screen.getByRole('button', { name: '刷 新' }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: '身份一致' })).not.toBeChecked())
  fireEvent.click(screen.getByRole('checkbox', { name: '身份一致' }))
  await act(async () => { view.rerender(draw(false)) })
  await act(async () => { view.rerender(draw()) })
  await waitFor(() => expect(screen.getByRole('checkbox', { name: '身份一致' })).not.toBeChecked())
  expect(mocks.review).not.toHaveBeenCalled()
})
