import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SnapshotFields } from '@/pages/certification/components/vendors/renshe/ApplicationReviewContent'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})

afterEach(() => cleanup())

it('renders historical eligibility snapshots with two-decimal years', () => {
  render(
    <SnapshotFields
      value={{
        eligibility_snapshot: {
          effective_years: '11.89864356789012345678901234567',
          required_years: '10.00',
        },
      }}
    />,
  )
  expect(screen.getByText('11.90 年')).toBeTruthy()
  expect(screen.getByText('10.00 年')).toBeTruthy()
  expect(screen.queryByText(/11\.89864356789012345678901234567/)).toBeNull()
})

it('recurses into unknown containers that hold known snapshot fields', () => {
  render(
    <SnapshotFields
      value={{ legacy_container: { effective_years: '9.87654321' } }}
    />,
  )
  expect(screen.getByText('9.88 年')).toBeTruthy()
  expect(screen.queryByText(/9\.87654321/)).toBeNull()
})
