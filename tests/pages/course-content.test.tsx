import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CourseContent, { validateChapterFile } from '@/pages/courses/CourseContent'

const mocks = vi.hoisted(() => ({ listChapters: vi.fn(), listUploads: vi.fn(), createUpload: vi.fn(), uploadChapterFile: vi.fn(), updateChapter: vi.fn() }))
vi.mock('@/services/courseManagement', () => ({ courseManagementService: mocks }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.listChapters.mockResolvedValue({ items: [
    { id: 1, title: '文档章节', resource_type: 'document', page_count: 24, duration: null, sort_order: 1, size_bytes: 1024, original_filename: 'book.pdf', resource_version: 1 },
    { id: 2, title: '视频章节', resource_type: 'video', page_count: null, duration: 120, sort_order: 2, size_bytes: 1024, original_filename: 'demo.mp4', resource_version: 1 },
  ], total: 2 })
  mocks.listUploads.mockResolvedValue([])
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('shows actual mixed chapter metadata in one content list', async () => {
  render(<CourseContent courseId={12} canWrite />)
  expect(await screen.findByText('共2章 · 视频1章 · 文档1章')).toBeTruthy()
  expect(screen.getByText('PDF · 24页')).toBeTruthy()
  expect(screen.getByText('视频 · 2分')).toBeTruthy()
  expect(screen.getAllByRole('button', { name: '预览' })).toHaveLength(2)
})

it('keeps selection order when reserving mixed upload tasks and does not ask for a course type', async () => {
  let id = 40
  mocks.createUpload.mockImplementation(async data => ({ ...data, id: ++id, filename: data.filename, kind: 'chapter_file', status: 'pending' }))
  mocks.uploadChapterFile.mockResolvedValue({ status: 'bound' })
  const { container } = render(<CourseContent courseId={12} canWrite />)
  await screen.findByText('文档章节')
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['pdf'], '知识.pdf'), new File(['video'], '演示.mp4')] } })
  await waitFor(() => expect(mocks.uploadChapterFile).toHaveBeenCalledTimes(2))
  expect(mocks.createUpload.mock.calls.map(([data]) => data.filename)).toEqual(['知识.pdf', '演示.mp4'])
  expect(mocks.createUpload.mock.calls.every(([data]) => data.kind === 'chapter_file' && !('duration' in data))).toBe(true)
  expect(screen.queryByText('创建课程名')).toBeNull()
})

it('rejects unsupported formats and oversized PDFs without sending requests', () => {
  expect(validateChapterFile({ name: 'slides.pptx', size: 100 })).toContain('转为 PDF')
  expect(validateChapterFile({ name: 'book.pdf', size: 50 * 1024 * 1024 + 1 })).toContain('50MB')
  expect(validateChapterFile({ name: 'book.PDF', size: 50 * 1024 * 1024 })).toBeNull()
  expect(mocks.createUpload).not.toHaveBeenCalled()
})
