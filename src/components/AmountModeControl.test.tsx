import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AmountModeControl } from './AmountModeControl'

const control = vi.hoisted(() => ({ onChange: undefined as ComponentProps<typeof import('@ionic/react').IonSegment>['onIonChange'] }))
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return { ...actual, IonSegment: (props: ComponentProps<typeof actual.IonSegment>) => {
    control.onChange = props.onIonChange
    return <actual.IonSegment {...props} />
  } }
})

describe('amount mode control', () => {
  it('shows the selected mode and only accepts the two supported values', () => {
    const onChange = vi.fn()
    const markup = renderToStaticMarkup(<AmountModeControl value="share" onChange={onChange} />)
    expect(markup).toContain('aria-label="Расчёт сумм"')
    expect(markup).toContain('Моя доля')
    expect(markup).toContain('Полные суммы')
    for (const value of ['total', 'share', undefined, 'family']) {
      control.onChange?.({ detail: { value } } as Parameters<NonNullable<typeof control.onChange>>[0])
    }
    expect(onChange.mock.calls).toEqual([['total'], ['share']])
  })
})
