import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode: ThemeMode) {
  const isDark = mode === 'dark' || (mode === 'system' && getSystemDark())
  document.body.classList.toggle('dark', isDark)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => {
        applyTheme(mode)
        set({ mode })
      },
    }),
    {
      name: 'theme-preference',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode)
      },
    },
  ),
)

const mq = window.matchMedia('(prefers-color-scheme: dark)')
mq.addEventListener('change', () => {
  const { mode } = useThemeStore.getState()
  if (mode === 'system') applyTheme('system')
})

applyTheme(useThemeStore.getState().mode)

export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode)
  if (mode === 'system') return getSystemDark()
  return mode === 'dark'
}
