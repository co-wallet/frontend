import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AmountMode } from '@/api/analytics'
import { useAuthStore } from './authStore'

interface AmountModeState {
  modesByUser: Record<string, AmountMode>
  setMode: (userId: string, mode: AmountMode) => void
}

export const useAmountModeStore = create<AmountModeState>()(
  persist(
    (set) => ({
      modesByUser: {},
      setMode: (userId, mode) => set((state) => ({
        modesByUser: { ...state.modesByUser, [userId]: mode },
      })),
    }),
    { name: 'amount-mode-preference', partialize: (state) => ({ modesByUser: state.modesByUser }) },
  ),
)

export function useAmountMode(): { mode: AmountMode; setMode: (mode: AmountMode) => void } {
  const userId = useAuthStore((state) => state.user?.id)
  const mode = useAmountModeStore((state): AmountMode =>
    userId && state.modesByUser[userId] === 'total' ? 'total' : 'share',
  )
  const setMode = useAmountModeStore((state) => state.setMode)
  return { mode, setMode: (next: AmountMode) => { if (userId) setMode(userId, next) } }
}
