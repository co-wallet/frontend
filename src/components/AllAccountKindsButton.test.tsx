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
    IonButton: ({ children, onClick, ...props }: ComponentProps<typeof import('@ionic/react').IonButton>) => {
      controls.click = () => onClick?.({} as Parameters<NonNullable<typeof onClick>>[0])
      return <actual.IonButton {...props}>{children}</actual.IonButton>
    },
  }
})

const allKinds = ACCOUNT_KIND_OPTIONS.map((option) => option.value)

describe('AllAccountKindsButton', () => {
  it.each([[], ['spending'], ['savings', 'deposit'], allKinds].map((initial) => ({ initial: initial as AccountKind[] })))(
    'selects every kind in one click from $initial and keeps repeated selection stable', ({ initial }) => {
      let selectedKinds = initial
      const onChange = vi.fn((kinds: AccountKind[]) => { selectedKinds = kinds })
      const render = () => renderToStaticMarkup(<AllAccountKindsButton
        selectedKinds={selectedKinds} onChange={onChange} className="filter-sheet-option" />)
      render()
      controls.click!()
      expect(onChange).toHaveBeenCalledExactlyOnceWith(allKinds)
      expect(render()).toContain('aria-pressed="true"')
      controls.click!()
      expect(selectedKinds).toEqual(allKinds)
      expect(onChange).toHaveBeenCalledTimes(2)
    },
  )

  it('announces a partial selection after excluding one kind', () => {
    const markup = renderToStaticMarkup(<AllAccountKindsButton
      selectedKinds={allKinds.filter((kind) => kind !== 'deposit')}
      onChange={vi.fn()} className="dashboard-kind-option" unselectedFill="clear" />)
    expect(markup).toContain('aria-label="Все типы средств"')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).toContain('fill="clear"')
    expect(markup).toContain('<span>Все</span>')
  })
})
