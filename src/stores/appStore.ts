import { create } from 'zustand'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'admin.sidebar.collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface AppState {
  sidebarCollapsed: boolean
  toggleCollapsed: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: readSidebarCollapsed(),
  toggleCollapsed: () => set((s) => {
    const sidebarCollapsed = !s.sidebarCollapsed
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        sidebarCollapsed ? '1' : '0',
      )
    } catch {
      // Browser storage can be unavailable in private/embedded webviews.
    }
    return { sidebarCollapsed }
  }),
}))
