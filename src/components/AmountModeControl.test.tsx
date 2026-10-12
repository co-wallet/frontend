import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AmountModeControl } from './AmountModeControl'

const control = vi.hoisted(() => ({ onChange: undefined as ComponentProps<typeof import('@ionic/react').IonCheckbox>['onIonChange'] }))
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return { ...actual, IonCheckbox: (props: ComponentProps<typeof actual.IonCheckbox>) => {
    control.onChange = props.onIonChange
    return <actual.IonCheckbox {...props} />
  } }
})

describe('amount mode control', () => {
  it.each(['share', 'total'] as const)('reflects %s and maps checked changes to the amount mode', (value) => {
    const onChange = vi.fn()
    const markup = renderToStaticMarkup(<AmountModeControl value={value} onChange={onChange} />)
    expect(markup).toContain('Показывать полные суммы')
    expect(markup).toContain(`checked="${value === 'total'}"`)
    expect(markup).not.toContain('ion-segment')
    for (const checked of [true, false]) {
      control.onChange?.({ detail: { checked } } as Parameters<NonNullable<typeof control.onChange>>[0])
    }
    expect(onChange.mock.calls).toEqual([['total'], ['share']])
  })
})
