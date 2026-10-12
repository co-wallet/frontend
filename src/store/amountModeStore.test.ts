import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('user amount mode preference', () => {
  it('persists each user independently and restores choices after reload', async () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    } })
    const { useAmountModeStore } = await import('./amountModeStore')
    expect(useAmountModeStore.getState().modesByUser).toEqual({})
    useAmountModeStore.getState().setMode('alice', 'total')
    useAmountModeStore.getState().setMode('bob', 'share')
    expect(useAmountModeStore.getState().modesByUser).toEqual({ alice: 'total', bob: 'share' })
    const { useAuthStore } = await import('./authStore')
    useAuthStore.getState().logout()
    expect(useAmountModeStore.getState().modesByUser.alice).toBe('total')
    vi.resetModules()
    const reloaded = await import('./amountModeStore')
    expect(reloaded.useAmountModeStore.getState().modesByUser).toEqual({ alice: 'total', bob: 'share' })
  })

})
