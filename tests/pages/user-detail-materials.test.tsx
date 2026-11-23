import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import UserDetailDrawer from '@/pages/users/components/UserDetailDrawer'
import { useAuthStore } from '@/stores/authStore'
import type { UserDetail, UserRealnameInfo } from '@/types/user'

const mocks = vi.hoisted(() => ({ sign: vi.fn() }))

vi.mock('@/components/ReviewHistory', () => ({ default: () => <div>审核记录占位</div> }))
vi.mock('@/services/users', () => ({ userService: {} }))
vi.mock('@/services/renshe', () => ({
  rensheService: { getVerificationMaterialSignedUrl: mocks.sign },
}))

beforeAll(() => {
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => computed(element, pseudo))
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false, addListener() {}, removeListener() {}, addEventListener() {},
      removeEventListener() {}, dispatchEvent() {}, media: '',
    })),
  })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

beforeEach(() => {
  mocks.sign.mockReset()
  mocks.sign.mockImplementation(async (id: number, kind: string) => ({ url: `/signed/${id}-${kind}.jpg`, expires_in: 60 }))
  useAuthStore.setState({ permissions: ['renshe:review'], initialized: true })
})

afterEach(cleanup)

function realname(userId: number): UserRealnameInfo {
  return {
    user_id: userId,
    user_type: 'student',
    last_name_zh: null,
    first_name_zh: null,
    last_name_en: null,
    first_name_en: null,
    real_name: '小宝',
    id_card_number: '510703200702130218',
    id_card_front_oss: `renshe/source/${userId}/front.jpg`,
    id_card_back_oss: `renshe/source/${userId}/back.jpg`,
    avatar_oss: `renshe/source/${userId}/portrait.jpg`,
    birth_date: '2007-02-13',
    gender: '男',
    age: 19,
    census_register: '绵阳市-涪城区',
    zip_code: null,
    political_status: null,
    ethnicity: '汉族',
    status: 'verified',
    verified_at: null,
    reject_reason: null,
    created_at: '2026-09-13T11:40:14+08:00',
    updated_at: '2026-09-13T11:40:14+08:00',
  }
}

function detail(userId: number): UserDetail {
  return {
    id: userId,
    openid: `openid-${userId}`,
    phone: '13800138000',
    is_active: true,
    created_at: '2026-11-20T10:00:00+08:00',
    orders: [],
    conversations: [],
    realname: realname(userId),
    student: {
      user_id: userId,
      education: '本科',
      school: '西南科技大学',
      major: '计算机科学与技术',
      student_card_oss: `renshe/source/${userId}/student-card.jpg`,
      enrollment_pdf_oss: `renshe/source/${userId}/xuexin.pdf`,
      degree_cert_oss: `renshe/source/${userId}/degree.jpg`,
      status: 'verified',
      verified_at: null,
      reject_reason: null,
      created_at: '2026-09-13T11:40:14+08:00',
      updated_at: '2026-09-13T11:40:14+08:00',
    },
  }
}

it('照片类材料直接渲染缩略图，PDF 只留预览下载不自动取图', async () => {
  render(<UserDetailDrawer user={detail(7)} open onClose={() => {}} />)

  expect(await screen.findByAltText('身份证正面')).toHaveAttribute('src', '/signed/7-id_card_front.jpg')
  expect(screen.getByAltText('身份证背面')).toHaveAttribute('src', '/signed/7-id_card_back.jpg')
  expect(screen.getByAltText('证件照')).toHaveAttribute('src', '/signed/7-portrait.jpg')
  expect(screen.getByAltText('学生证')).toHaveAttribute('src', '/signed/7-student_card.jpg')
  expect(screen.getByAltText('学历证明')).toHaveAttribute('src', '/signed/7-education_proof.jpg')
  expect(mocks.sign.mock.calls.map(call => [call[0], call[1], call[2]])).toEqual([
    [7, 'id_card_front', false],
    [7, 'id_card_back', false],
    [7, 'portrait', false],
    [7, 'student_card', false],
    [7, 'education_proof', false],
  ])
})

it('没有人社审核权限时不自动取图，仅保留下载入口', () => {
  useAuthStore.setState({ permissions: ['user:write'], initialized: true })
  render(<UserDetailDrawer user={detail(7)} open onClose={() => {}} />)

  expect(screen.queryByAltText('身份证正面')).toBeNull()
  expect(screen.queryByAltText('学生证')).toBeNull()
  expect(screen.getAllByRole('button', { name: /下载/ })).toHaveLength(6)
  expect(mocks.sign).not.toHaveBeenCalled()
})

it('切换用户后重新签名，不残留上一位用户的照片', async () => {
  const view = render(<UserDetailDrawer user={detail(7)} open onClose={() => {}} />)
  expect(await screen.findByAltText('身份证正面')).toHaveAttribute('src', '/signed/7-id_card_front.jpg')

  view.rerender(<UserDetailDrawer user={detail(8)} open onClose={() => {}} />)
  expect(await screen.findByAltText('身份证正面')).toHaveAttribute('src', '/signed/8-id_card_front.jpg')
  expect(mocks.sign).toHaveBeenCalledWith(8, 'id_card_front', false)
})
