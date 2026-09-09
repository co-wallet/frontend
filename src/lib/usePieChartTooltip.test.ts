import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePieChartTooltip } from './usePieChartTooltip'

const state = vi.hoisted(() => ({
  active: false,
  trigger: 'click' as 'click' | 'hover',
  effects: [] as Array<() => void | (() => void)>,
}))

vi.mock('./useChartTooltipTrigger', () => ({ useChartTooltipTrigger: () => state.trigger }))
vi.mock('react', () => ({
  useState: () => [state.active, (active: boolean) => { state.active = active }],
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect) },
}))

beforeEach(() => {
  state.active = false
  state.trigger = 'click'
  state.effects = []
  vi.stubGlobal('document', new EventTarget())
})
afterEach(() => vi.unstubAllGlobals())

describe('usePieChartTooltip', () => {
  it('opens on a sector tap, dismisses on an area tap and reopens on the same sector', () => {
    let tooltip = usePieChartTooltip()
    state.effects[0]()
    expect(tooltip.active).toBe(false)

    document.dispatchEvent(new Event('click'))
    tooltip.onSectorClick()
    tooltip = usePieChartTooltip()
    expect(tooltip.active).toBe(true)

    document.dispatchEvent(new Event('click'))
    tooltip = usePieChartTooltip()
    expect(tooltip.active).toBe(false)

    document.dispatchEvent(new Event('click'))
    tooltip.onSectorClick()
    expect(usePieChartTooltip().active).toBe(true)
  })

  it('keeps the next sector tooltip open after dismissing the previous one', () => {
    const tooltip = usePieChartTooltip()
    state.effects[0]()
    tooltip.onSectorClick()
    document.dispatchEvent(new Event('click'))
    tooltip.onSectorClick()
    expect(usePieChartTooltip().active).toBe(true)
  })

  it('uses capture phase and removes the document listener on unmount', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    usePieChartTooltip()
    const cleanup = state.effects[0]()
    expect(add).toHaveBeenCalledWith('click', expect.any(Function), true)
    cleanup?.()
    expect(remove).toHaveBeenCalledWith('click', add.mock.calls[0][1], true)
  })

  it('leaves desktop hover visibility under Recharts control', () => {
    state.trigger = 'hover'
    const add = vi.spyOn(document, 'addEventListener')
    const tooltip = usePieChartTooltip()
    state.effects[0]()
    tooltip.onSectorClick()
    expect(usePieChartTooltip().active).toBeUndefined()
    expect(add).not.toHaveBeenCalled()
  })
})
