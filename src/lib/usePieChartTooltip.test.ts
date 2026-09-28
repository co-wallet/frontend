import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePieChartTooltip } from './usePieChartTooltip'

const state = vi.hoisted(() => ({
  active: false,
  navigationRef: { current: { activeSector: null as string | null, capturedSector: null as string | null } },
  trigger: 'click' as 'click' | 'hover',
  effects: [] as Array<() => void | (() => void)>,
}))

vi.mock('./useChartTooltipTrigger', () => ({ useChartTooltipTrigger: () => state.trigger }))
vi.mock('react', () => ({
  useState: () => [state.active, (active: boolean) => { state.active = active }],
  useRef: () => state.navigationRef,
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect) },
}))

beforeEach(() => {
  state.active = false
  state.navigationRef = { current: { activeSector: null, capturedSector: null } }
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

  it('navigates only after a second tap on the same mobile sector', () => {
    const navigate = vi.fn()
    let tooltip = usePieChartTooltip()
    state.effects[0]()

    document.dispatchEvent(new Event('click'))
    tooltip.onNavigableSectorClick('account-1', navigate)
    expect(navigate).not.toHaveBeenCalled()
    expect(state.active).toBe(true)

    tooltip = usePieChartTooltip()
    document.dispatchEvent(new Event('click'))
    tooltip = usePieChartTooltip()
    tooltip.onNavigableSectorClick('account-1', navigate)
    expect(navigate).toHaveBeenCalledOnce()
    expect(state.active).toBe(false)
  })

  it('shows the newly tapped mobile sector before allowing navigation', () => {
    const navigate = vi.fn()
    let tooltip = usePieChartTooltip()
    state.effects[0]()
    document.dispatchEvent(new Event('click'))
    tooltip.onNavigableSectorClick('account-1', navigate)

    tooltip = usePieChartTooltip()
    document.dispatchEvent(new Event('click'))
    tooltip.onNavigableSectorClick('account-2', navigate)
    expect(navigate).not.toHaveBeenCalled()
    expect(state.navigationRef.current.activeSector).toBe('account-2')

    tooltip = usePieChartTooltip()
    document.dispatchEvent(new Event('click'))
    tooltip.onNavigableSectorClick('account-2', navigate)
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('navigates on desktop click because hover already reveals the tooltip', () => {
    state.trigger = 'hover'
    const navigate = vi.fn()
    const tooltip = usePieChartTooltip()
    tooltip.onNavigableSectorClick('account-1', navigate)
    expect(navigate).toHaveBeenCalledOnce()
  })
})
