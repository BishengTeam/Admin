import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/stores/appStore'

describe('admin application store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAppStore.setState({ sidebarCollapsed: false })
  })

  it('persists the sidebar collapsed preference', () => {
    useAppStore.getState().toggleCollapsed()
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
    expect(window.localStorage.getItem('admin.sidebar.collapsed')).toBe('1')

    useAppStore.getState().toggleCollapsed()
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
    expect(window.localStorage.getItem('admin.sidebar.collapsed')).toBe('0')
  })
})
