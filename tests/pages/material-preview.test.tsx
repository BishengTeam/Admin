import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MaterialPreview from '@/pages/certification/components/vendors/renshe/MaterialPreview'

let intersect: (entries: { isIntersecting: boolean }[]) => void
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof intersect) { intersect = callback } observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('loads visible thumbnails only, refreshes expired URLs and uses business titles', async () => {
  const signer = vi.fn().mockResolvedValueOnce({ url: '/expired.jpg', expires_in: 60 }).mockResolvedValueOnce({ url: '/fresh.jpg', expires_in: 60 })
  render(<MaterialPreview available thumbnail businessTitle='工龄证明' versionNo={2} filename='random-uuid.jpg' contentType='image/jpeg' sizeBytes={1024} getSignedUrl={signer} />)
  expect(signer).not.toHaveBeenCalled()
  expect(screen.queryByText('random-uuid.jpg')).toBeNull()
  await act(async () => intersect([{ isIntersecting: true }]))
  const image = await screen.findByAltText('工龄证明')
  expect(image).toHaveAttribute('src', '/expired.jpg')
  fireEvent.error(image)
  expect(screen.getByText('预览已过期或加载失败，请重试')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '重 试' }))
  await waitFor(() => expect(screen.getByAltText('工龄证明')).toHaveAttribute('src', '/fresh.jpg'))
  fireEvent.click(screen.getByAltText('工龄证明'))
  expect(await screen.findByText('工龄证明 · 版本 2')).toBeTruthy()
  expect(signer).toHaveBeenCalledTimes(2)
})

it('cleared materials never sign and PDF previews only sign on explicit action', async () => {
  const signer = vi.fn().mockResolvedValue({ url: '/proof.pdf', expires_in: 60 })
  const view = render(<MaterialPreview available cleared thumbnail businessTitle='承诺书' filename='hidden.pdf' getSignedUrl={signer} />)
  expect(screen.getByText('材料已清理')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /预览/ })).toBeNull()
  expect(signer).not.toHaveBeenCalled()
  view.rerender(<MaterialPreview available thumbnail businessTitle='承诺书' versionNo={1} filename='hidden.pdf' getSignedUrl={signer} />)
  expect(signer).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /预览/ }))
  expect(await screen.findByTitle('承诺书 · 版本 1')).toHaveAttribute('src', '/proof.pdf')
  expect(signer).toHaveBeenCalledWith(false)
})

it('ignores an old resource response after switching material', async () => {
  let finish!: (value: { url: string; expires_in: number }) => void
  const old = vi.fn(() => new Promise<{ url: string; expires_in: number }>(resolve => { finish = resolve }))
  const view = render(<MaterialPreview available businessTitle='身份证正面' resourceKey='old' filename='old.pdf' getSignedUrl={old} />)
  fireEvent.click(screen.getByRole('button', { name: /预览/ }))
  view.rerender(<MaterialPreview available businessTitle='毕业证' resourceKey='new' filename='new.pdf' getSignedUrl={vi.fn()} />)
  await act(async () => finish({ url: '/wrong-person.pdf', expires_in: 60 }))
  expect(screen.queryByTitle(/身份证正面/)).toBeNull()
  expect(screen.queryByTitle('毕业证')).toBeNull()
})
