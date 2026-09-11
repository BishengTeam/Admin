import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from 'antd'
import AgreementTemplates from '@/pages/agreementTemplates'
import { agreementTemplateService } from '@/services/agreementTemplate'
import { useAuthStore } from '@/stores/authStore'
import type { AgreementTemplateItem } from '@/types/agreementTemplate'

vi.mock('@/services/agreementTemplate', () => ({
  agreementTemplateService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  },
}))

const now = '2026-09-11T10:00:00+08:00'

function template(overrides: Partial<AgreementTemplateItem> = {}): AgreementTemplateItem {
  return {
    id: 11,
    type: 'user_terms',
    title: '用户服务协议',
    content: '<p>协议全文</p>',
    version: 3,
    status: 'active',
    cover_url: '/api/media/user-terms.jpg',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

beforeAll(() => {
  const nativeGetComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => (
    nativeGetComputedStyle(element)
  ))

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('AgreementTemplates book shelf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      permissions: ['content:list', 'content:write'],
      initialized: true,
    })
    vi.mocked(agreementTemplateService.list).mockResolvedValue({
      items: [template()],
      total: 1,
      page: 1,
      page_size: 20,
    })
  })

  afterEach(() => {
    cleanup()
    Modal.destroyAll()
  })

  it('loads only active templates and renders book covers', async () => {
    render(<AgreementTemplates />)

    expect(await screen.findByRole('img', { name: '用户服务协议内容缩略图' })).toBeInTheDocument()
    expect(screen.getAllByText('用户服务协议').length).toBeGreaterThan(0)
    expect(screen.getAllByText('版本 v3').length).toBeGreaterThan(0)
    expect(screen.getByText(/更新于 2026-09-11 10:00:00/)).toBeInTheDocument()
    expect(agreementTemplateService.list).toHaveBeenCalledWith({
      status: 'active',
      page: 1,
      page_size: 20,
    })
  })

  it('opens read-only full content when a card cover is clicked', async () => {
    render(<AgreementTemplates />)

    fireEvent.click(
      await screen.findByRole('button', { name: '预览 用户服务协议 第 3 版全文' }),
    )

    expect(await screen.findByText('协议全文')).toBeInTheDocument()
    expect(screen.getAllByText('版本 v3').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /保存并生成新版本/ })).not.toBeInTheDocument()
  })

  it('renders a placeholder when the active cover is missing', async () => {
    vi.mocked(agreementTemplateService.list).mockResolvedValueOnce({
      items: [template({ cover_url: null })],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(<AgreementTemplates />)

    expect(await screen.findByText('封面暂不可用')).toBeInTheDocument()
    expect(screen.getByText('可点击查看协议全文')).toBeInTheDocument()
  })

  it('keeps write actions away from read-only admins and leaves create disabled', async () => {
    useAuthStore.setState({ permissions: ['content:list'], initialized: true })

    render(<AgreementTemplates />)

    await screen.findByRole('img', { name: '用户服务协议内容缩略图' })
    const cover = screen.getByRole('button', { name: '隐私政策暂无生效版本' })
    expect(cover).toBeDisabled()
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '归档' })).not.toBeInTheDocument()
  })

  it('opens the create modal from an empty protocol slot', async () => {
    render(<AgreementTemplates />)

    await screen.findByRole('img', { name: '用户服务协议内容缩略图' })
    fireEvent.click(screen.getByRole('button', { name: '创建隐私政策' }))

    expect(await screen.findByText('新建协议模板')).toBeInTheDocument()
  })

  it('opens the edit modal from a write-authorized card', async () => {
    render(<AgreementTemplates />)

    fireEvent.click((await screen.findAllByRole('button', { name: /编辑/ }))[0])

    expect(await screen.findByText('编辑模板（当前 v3）')).toBeInTheDocument()
  })

  it('archives the active template after confirmation', async () => {
    vi.mocked(agreementTemplateService.archive).mockResolvedValue(
      template({ status: 'archived' }),
    )

    render(<AgreementTemplates />)
    fireEvent.click((await screen.findAllByRole('button', { name: /归档/ }))[0])
    fireEvent.click(await screen.findByRole('button', { name: /OK|确定/ }))

    await waitFor(() => {
      expect(agreementTemplateService.archive).toHaveBeenCalledWith(11)
    })
  })

  it('loads archived versions on demand in a history drawer', async () => {
    vi.mocked(agreementTemplateService.list)
      .mockResolvedValueOnce({ items: [template()], total: 1, page: 1, page_size: 20 })
      .mockResolvedValueOnce({
        items: [template({
          id: 10,
          version: 2,
          status: 'archived',
          cover_url: null,
          title: '用户服务协议 v2',
        })],
        total: 1,
        page: 1,
        page_size: 8,
      })

    render(<AgreementTemplates />)
    fireEvent.click((await screen.findAllByRole('button', { name: /历史/ }))[0])

    expect(await screen.findByText('用户服务协议 v2')).toBeInTheDocument()
    expect(screen.getByText('已归档')).toBeInTheDocument()
    await waitFor(() => {
      expect(agreementTemplateService.list).toHaveBeenLastCalledWith({
        type: 'user_terms',
        status: 'archived',
        page: 1,
        page_size: 8,
      })
    })
  })
})
