import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDragClickGuard } from './useDragClickGuard'

const state = vi.hoisted(() => ({
  effect: undefined as undefined | (() => (() => void) | void),
}))
vi.mock('react', () => ({
  useRef: (value: unknown) => ({ current: value }),
  useEffect: (effect: typeof state.effect) => { state.effect = effect },
}))

const doc = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('document', doc) })
afterEach(() => { vi.unstubAllGlobals() })

describe('drag click guard', () => {
  it('prevents default anchor navigation in document capture after a drag', () => {
    const guard = useDragClickGuard()
    guard.ref.current = {} as HTMLDivElement
    const cleanup = state.effect!()
    expect(doc.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), true)
    const click = doc.addEventListener.mock.calls[0][1]
    const event = { composedPath: () => [guard.ref.current], preventDefault: vi.fn(), stopPropagation: vi.fn() }
    guard.suppress.current = true
    click(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
    click(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    cleanup?.()
    expect(doc.removeEventListener).toHaveBeenCalledWith('click', click, true)
  })

  it('leaves normal taps and clicks outside the account list alone', () => {
    const guard = useDragClickGuard()
    guard.ref.current = {} as HTMLDivElement
    const cleanup = state.effect!()
    const click = doc.addEventListener.mock.calls[0][1]
    const event = { composedPath: () => [guard.ref.current], preventDefault: vi.fn(), stopPropagation: vi.fn() }
    click(event)
    guard.suppress.current = true
    click({ ...event, composedPath: () => [] })
    guard.reset()
    click(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    cleanup?.()
  })
})
