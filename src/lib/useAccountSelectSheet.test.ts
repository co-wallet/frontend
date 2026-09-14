import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAccountSelectSheet } from './useAccountSelectSheet'

const store = vi.hoisted(() => ({
  subscribe: undefined as undefined | ((callback: () => void) => () => void),
}))

vi.mock('react', () => ({
  useSyncExternalStore: (subscribe: (callback: () => void) => () => void, getSnapshot: () => boolean) => {
    store.subscribe = subscribe
    return getSnapshot()
  },
}))

afterEach(() => vi.unstubAllGlobals())

describe('useAccountSelectSheet', () => {
  it.each([
    { matches: true, trigger: true },
    { matches: false, trigger: false },
  ])('uses $trigger for the viewport width', ({ matches, trigger }) => {
    const matchMedia = vi.fn(() => ({ matches }))
    vi.stubGlobal('window', { matchMedia })
    expect(useAccountSelectSheet()).toBe(trigger)
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('subscribes to viewport changes and removes the listener on unmount', () => {
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.stubGlobal('window', { matchMedia: () => media })
    expect(useAccountSelectSheet()).toBe(false)
    const onChange = vi.fn()
    const unsubscribe = store.subscribe!(onChange)
    expect(media.addEventListener).toHaveBeenCalledWith('change', onChange)
    media.matches = true
    expect(useAccountSelectSheet()).toBe(true)
    unsubscribe()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange)
  })
})
