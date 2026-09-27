import { Children, type ReactElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: <T,>(initial: T) => [initial, vi.fn()],
    useRef: <T,>(initial: T) => ({ current: initial }),
  }
})

import { QuickTransactionFab } from './QuickTransactionFab'

describe('QuickTransactionFab touch gesture', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      elementFromPoint: () => ({
        closest: () => ({ dataset: { transactionType: 'transfer' } }),
      }),
    })
  })

  it('selects the action under the release point after a held touch', () => {
    const onSelect = vi.fn()
    const tree = QuickTransactionFab({ onSelect }) as ReactElement<{ children: ReactNode }>
    const [mainButton] = Children.toArray(tree.props.children) as ReactElement[]
    let captured = false
    const currentTarget = {
      setPointerCapture: () => { captured = true },
      hasPointerCapture: () => captured,
      releasePointerCapture: () => { captured = false },
    }

    mainButton.props.onPointerDown({ pointerType: 'touch', pointerId: 1, currentTarget })
    mainButton.props.onPointerUp({ pointerId: 1, clientX: 20, clientY: 30, currentTarget })

    expect(onSelect).toHaveBeenCalledWith('transfer')
    expect(captured).toBe(false)
  })
})
