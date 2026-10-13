import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { AccountKind } from '@/api/accounts'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'
import { AllAccountKindsButton } from './AllAccountKindsButton'

const controls = vi.hoisted(() => ({ click: undefined as undefined | (() => void) }))
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonItem: ({ children, onClick, ...props }: ComponentProps<typeof import('@ionic/react').IonItem>) => {
      controls.click = () => onClick?.({} as Parameters<NonNullable<typeof onClick>>[0])
      return <actual.IonItem {...props}>{children}</actual.IonItem>
    },
  }
})

const allKinds = ACCOUNT_KIND_OPTIONS.map((option) => option.value)

describe('AllAccountKindsButton', () => {
  it.each([[], ['spending'], ['savings', 'deposit'], allKinds].map((initial) => ({ initial: initial as AccountKind[] })))(
    'toggles between all and no kinds from $initial', ({ initial }) => {
      let selectedKinds = initial
      const onChange = vi.fn((kinds: AccountKind[]) => { selectedKinds = kinds })
      const render = () => renderToStaticMarkup(<AllAccountKindsButton
        selectedKinds={selectedKinds} onChange={onChange} className="filter-sheet-option" />)
      render()
      controls.click!()
      const initiallyAll = initial.length === allKinds.length
      expect(onChange).toHaveBeenCalledExactlyOnceWith(initiallyAll ? [] : allKinds)
      expect(render()).toContain(`aria-checked="${!initiallyAll}"`)
      controls.click!()
      expect(selectedKinds).toEqual(initiallyAll ? allKinds : [])
      expect(render()).toContain(`aria-checked="${initiallyAll}"`)
      expect(onChange).toHaveBeenCalledTimes(2)
    },
  )

  it('announces a partial selection after excluding one kind', () => {
    const markup = renderToStaticMarkup(<AllAccountKindsButton
      selectedKinds={allKinds.filter((kind) => kind !== 'deposit')}
      onChange={vi.fn()} className="dashboard-kind-option" />)
    expect(markup).toContain('aria-label="Все типы средств"')
    expect(markup).toContain('aria-checked="false"')
    expect(markup).toContain('role="checkbox"')
    expect(markup).toContain('Все</ion-label>')
  })
})
