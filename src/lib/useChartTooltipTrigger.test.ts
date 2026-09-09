import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChartTooltipTrigger } from './useChartTooltipTrigger'

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

describe('useChartTooltipTrigger', () => {
  it.each([
    { matches: true, trigger: 'click' },
    { matches: false, trigger: 'hover' },
  ])('uses $trigger for the current input capabilities', ({ matches, trigger }) => {
    const matchMedia = vi.fn(() => ({ matches }))
    vi.stubGlobal('window', { matchMedia })
    expect(useChartTooltipTrigger()).toBe(trigger)
    expect(matchMedia).toHaveBeenCalledWith('(hover: none), (pointer: coarse)')
  })

  it('subscribes to input capability changes and removes the listener on unmount', () => {
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.stubGlobal('window', { matchMedia: () => media })
    expect(useChartTooltipTrigger()).toBe('hover')
    const onChange = vi.fn()
    const unsubscribe = store.subscribe!(onChange)
    expect(media.addEventListener).toHaveBeenCalledWith('change', onChange)
    media.matches = true
    expect(useChartTooltipTrigger()).toBe('click')
    unsubscribe()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange)
  })
})
