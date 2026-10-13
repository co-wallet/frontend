import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecentTransactionsFit as runFitHook } from './useRecentTransactionsFit'

const hooks = vi.hoisted(() => ({
  card: null as unknown,
  fit: { count: 0, compact: true },
  deps: undefined as unknown[] | undefined,
  effect: undefined as (() => void | (() => void)) | undefined,
  cleanup: undefined as (() => void) | undefined,
}))
vi.mock('react', () => ({
  useRef: () => ({ current: hooks.card }),
  useState: () => [hooks.fit, (update: (previous: typeof hooks.fit) => typeof hooks.fit) => { hooks.fit = update(hooks.fit) }],
  useEffect: (effect: typeof hooks.effect, deps?: unknown[]) => {
    if (!deps || !hooks.deps || deps.some((dep, index) => dep !== hooks.deps![index])) {
      hooks.cleanup?.()
      hooks.effect = effect
      hooks.deps = deps
    }
  },
}))

let top: number
let padding: number
let fabTop: number | undefined
let notifyResize: () => void
let frames: Map<number, FrameRequestCallback>
let disconnect: ReturnType<typeof vi.fn>
let resolveScroll: () => Promise<unknown>
const data = [{ id: 'transaction' }]

async function render(content: unknown = data, status = 'ready') {
  runFitHook(content, status)
  if (hooks.effect) {
    const effect = hooks.effect
    hooks.effect = undefined
    hooks.cleanup = effect() || undefined
  }
  await Promise.resolve()
  return hooks.fit
}
function flushFrame() {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(0))
}

beforeEach(() => {
  hooks.deps = undefined
  hooks.effect = undefined
  hooks.cleanup = undefined
  hooks.fit = { count: 0, compact: true }
  top = 700
  padding = 0
  fabTop = undefined
  frames = new Map()
  let frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('getComputedStyle', () => ({ paddingBottom: String(padding), marginBottom: '0' }))
  const windowTarget = Object.assign(new EventTarget(), { innerHeight: 1000 })
  vi.stubGlobal('window', windowTarget)
  disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notifyResize = callback }
    observe() {}
    disconnect = disconnect
  })
  const element = (height: number) => ({ getBoundingClientRect: () => ({ height }) })
  const scroll = { scrollTop: 0, getBoundingClientRect: () => ({ bottom: 1000 }) }
  resolveScroll = vi.fn().mockResolvedValue(scroll)
  const content = { getScrollElement: resolveScroll, querySelector: () => ({ getBoundingClientRect: () => ({ top: fabTop, height: fabTop === undefined ? 0 : 56 }) }) }
  hooks.card = {
    closest: () => content,
    parentElement: { getBoundingClientRect: () => ({ top }) },
    querySelector: (selector: string) => selector.endsWith('header') ? element(48) : selector.endsWith('footer') ? element(52) : null,
    querySelectorAll: () => [element(80), element(60)],
  }
})
afterEach(() => { hooks.cleanup?.(); vi.unstubAllGlobals() })

describe('useRecentTransactionsFit', () => {
  it.each([950, 1200])('hides preview rows when no footer space fits at top %s without hiding the card', async (cardTop) => {
    top = cardTop
    await render()
    flushFrame()
    expect(hooks.fit).toEqual({ count: 0, compact: true })
  })
  it('restores rows after expanding and collapsing filters without a render loop', async () => {
    await render()
    flushFrame()
    expect(hooks.fit).toEqual({ count: 2, compact: false })
    await render()
    expect(frames.size).toBe(0)
    top = 940
    notifyResize()
    flushFrame()
    expect(hooks.fit).toEqual({ count: 0, compact: true })
    await render()
    top = 700
    notifyResize()
    flushFrame()
    expect(hooks.fit.count).toBe(2)
    await render()
    expect(frames.size).toBe(0)
    expect(resolveScroll).toHaveBeenCalledTimes(1)
  })

  it('fits the first transaction above the FAB without subtracting its scrolling reserve', async () => {
    top = 636
    padding = 104
    window.innerHeight = 900
    fabTop = 834
    await render()
    flushFrame()
    expect(hooks.fit).toEqual({ count: 1, compact: false })
  })

  it('uses all available space for rows when the card has no header', async () => {
    top = 800
    const card = hooks.card as { querySelector: (selector: string) => unknown }
    const querySelector = card.querySelector
    card.querySelector = (selector) => selector.endsWith('header') ? null : querySelector(selector)
    await render()
    flushFrame()
    expect(hooks.fit).toEqual({ count: 2, compact: false })
  })

  it.each([
    { available: 154, count: 1, compact: true },
    { available: 132, count: 1, compact: true },
    { available: 131, count: 0, compact: true },
    { available: 180, count: 1, compact: false },
  ])('fits $count complete rows in $available px without reserving a hidden header', async (test) => {
    top = 1000 - test.available - 2
    await render()
    flushFrame()
    expect(hooks.fit).toEqual({ count: test.count, compact: test.compact })
  })

  it('batches resize notifications into one frame and cancels it on unmount', async () => {
    await render()
    notifyResize()
    notifyResize()
    expect(frames.size).toBe(1)
    hooks.cleanup?.()
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('rebinds measurements when query data or loading state changes', async () => {
    await render(undefined, 'loading')
    await render(data)
    expect(disconnect).toHaveBeenCalledTimes(1)
    await render([{ id: 'replacement' }])
    expect(disconnect).toHaveBeenCalledTimes(2)
    flushFrame()
    expect(hooks.fit.count).toBe(2)
  })
})
