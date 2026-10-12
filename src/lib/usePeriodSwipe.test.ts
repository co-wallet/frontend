import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GestureConfig, GestureDetail } from '@ionic/react'
import type { TransactionPeriod } from './transactionNavigation'
import { usePeriodSwipe as runSwipeHook } from './usePeriodSwipe'

const state = vi.hoisted(() => ({
  refs: [] as { current: unknown }[],
  index: 0,
  effect: undefined as (() => void | (() => void)) | undefined,
  config: undefined as GestureConfig | undefined,
  content: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  enable: vi.fn(), destroy: vi.fn(),
}))
vi.mock('react', () => ({
  useRef: (initial: unknown) => {
    const index = state.index++
    state.refs[index] ??= { current: index === 0 ? state.content : initial }
    return state.refs[index]
  },
  useEffect: (effect: typeof state.effect) => { state.effect ??= effect },
}))
vi.mock('@ionic/react', () => ({
  createGesture: (config: GestureConfig) => {
    state.config = config
    return { enable: state.enable, destroy: state.destroy }
  },
}))

const value: TransactionPeriod = { period: 'month', periodOffset: -1, customFrom: '', customTo: '' }
function render(period = value, enabled = true) {
  state.index = 0
  const onChange = vi.fn()
  runSwipeHook(period, onChange, enabled)
  return onChange
}
function detail(overrides: Partial<GestureDetail> = {}): GestureDetail {
  return {
    startX: 200, deltaX: -100, deltaY: 0,
    event: { type: 'touchend', target: { closest: () => null } },
    ...overrides,
  } as GestureDetail
}
function swipe(dx = -100, dy = 0, event?: UIEvent) {
  state.config!.onStart?.(detail())
  state.config!.onEnd?.(detail({ deltaX: dx, deltaY: dy, ...(event ? { event } : {}) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  state.refs = []
  state.effect = undefined
  vi.stubGlobal('window', { innerWidth: 390 })
})

describe('usePeriodSwipe', () => {
  it('attaches to content and moves to next/previous periods', () => {
    const onChange = render()
    const cleanup = state.effect!()
    expect(state.config!.el).toBe(state.content)
    expect(state.enable).toHaveBeenCalledOnce()
    expect(state.config!.canStart?.(detail())).toBe(true)
    swipe()
    swipe(100)
    expect(onChange.mock.calls).toEqual([[{ periodOffset: 0 }], [{ periodOffset: -2 }]])
    cleanup?.()
    expect(state.destroy).toHaveBeenCalledOnce()
    expect(state.content.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function), true)
  })

  it('uses the latest period/callback and stops at the current period', () => {
    const original = render()
    const cleanup = state.effect!()
    const onChange = render({ ...value, periodOffset: 0 })
    swipe()
    expect(onChange).not.toHaveBeenCalled()
    swipe(100)
    expect(onChange).toHaveBeenCalledWith({ periodOffset: -1 })
    expect(original).not.toHaveBeenCalled()
    cleanup?.()
  })

  it.each([0, 31, 360, 390])('reserves the edge at x=%s for native navigation', startX => {
    render()
    const cleanup = state.effect!()
    expect(state.config!.canStart?.(detail({ startX }))).toBe(false)
    cleanup?.()
  })

  it('excludes controls/overlays but accepts the transaction row tap surface', () => {
    render()
    const cleanup = state.effect!()
    for (const row of [false, true]) {
      const event = {
        target: { closest: (selector: string) => selector.startsWith('button')
          ? { classList: { contains: () => row } } : null },
      } as unknown as UIEvent
      expect(state.config!.canStart?.(detail({ event }))).toBe(row)
    }
    const blocked = { target: { closest: () => ({}) } } as unknown as UIEvent
    expect(state.config!.canStart?.(detail({ event: blocked }))).toBe(false)
    cleanup?.()
  })

  it('ignores hidden/inactive pages and arbitrary ranges, even during a gesture', () => {
    render(value, false)
    const cleanup = state.effect!()
    expect(state.config!.canStart?.(detail())).toBe(false)
    const onChange = render({ ...value, period: 'custom' })
    expect(state.config!.canStart?.(detail())).toBe(true)
    swipe(100)
    expect(onChange).not.toHaveBeenCalled()
    const inactive = render(value, false)
    swipe(100)
    expect(inactive).not.toHaveBeenCalled()
    cleanup?.()
  })

  it.each([[-30, 0], [-100, 100], [0, 100]])('ignores short/vertical movement dx=%s dy=%s', (dx, dy) => {
    const onChange = render()
    const cleanup = state.effect!()
    swipe(dx, dy)
    expect(onChange).not.toHaveBeenCalled()
    cleanup?.()
  })

  it('ignores cancelled and multi-touch gestures', () => {
    const onChange = render()
    const cleanup = state.effect!()
    swipe(-100, 0, { type: 'touchcancel' } as UIEvent)
    const event = { touches: [{}, {}], target: { closest: () => null } } as unknown as UIEvent
    expect(state.config!.canStart?.(detail({ event }))).toBe(false)
    state.config!.onStart?.(detail())
    state.config!.onMove?.(detail({ event }))
    state.config!.onEnd?.(detail())
    expect(onChange).not.toHaveBeenCalled()
    cleanup?.()
  })

  it.each(['month', 'custom'] as const)('suppresses the row click after a %s swipe and restores normal taps', period => {
    render({ ...value, period })
    const cleanup = state.effect!()
    const click = state.content.addEventListener.mock.calls[0][1]
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
    state.config!.onStart?.(detail())
    click(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
    click(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    cleanup?.()
  })
})
