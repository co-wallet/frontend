import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { IonButton, IonSelect } from '@ionic/react'
import { PeriodControl } from './PeriodControl'
import type { Period } from '@/store/periodStore'

const controls = vi.hoisted(() => ({
  buttons: [] as ComponentProps<typeof IonButton>[],
  selects: [] as ComponentProps<typeof IonSelect>[],
}))
vi.mock('@ionic/react', async (importOriginal) => {
  const ionic = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...ionic,
    IonButton: (props: ComponentProps<typeof IonButton>) => {
      controls.buttons.push(props)
      return <ionic.IonButton {...props} />
    },
    IonSelect: (props: ComponentProps<typeof IonSelect>) => {
      controls.selects.push(props)
      return <ionic.IonSelect {...props} />
    },
  }
})
afterEach(() => { controls.buttons = []; controls.selects = [] })

function renderPeriod(period: Period = 'month', periodOffset = -1) {
  const onChange = vi.fn()
  const markup = renderToStaticMarkup(<PeriodControl
    value={{ period, periodOffset, customFrom: '2026-08-01', customTo: '2026-08-20' }}
    onChange={onChange} />)
  return { onChange, markup }
}

describe('PeriodControl', () => {
  it.each(['day', 'week', 'month', 'quarter', 'year'] as const)('moves the selected %s backward and forward', (period) => {
    const { onChange } = renderPeriod(period)
    const previous = controls.buttons.find((p) => p['aria-label'] === 'Предыдущий период')!
    const next = controls.buttons.find((p) => p['aria-label'] === 'Следующий период')!
    expect(previous.disabled).toBe(false)
    expect(next.disabled).toBe(false)
    previous.onClick?.({} as Parameters<NonNullable<typeof previous.onClick>>[0])
    next.onClick?.({} as Parameters<NonNullable<typeof next.onClick>>[0])
    expect(onChange.mock.calls).toEqual([[{ periodOffset: -2 }], [{ periodOffset: 0 }]])
  })

  it('disables moving past the current period', () => {
    renderPeriod('year', 0)
    expect(controls.buttons.find((p) => p['aria-label'] === 'Следующий период')?.disabled).toBe(true)
    expect(controls.buttons.find((p) => p['aria-label'] === 'Предыдущий период')?.disabled).toBe(false)
  })

  it('resets the offset when selecting another period type', () => {
    const { onChange } = renderPeriod('month', -5)
    const select = controls.selects[0]
    select.onIonChange?.({ detail: { value: 'quarter' } } as Parameters<NonNullable<typeof select.onIonChange>>[0])
    expect(onChange).toHaveBeenCalledWith({ period: 'quarter', periodOffset: 0 })
  })

  it('uses explicit dates and disables both arrows for a custom period', () => {
    const { markup } = renderPeriod('custom')
    expect(controls.buttons.every((button) => button.disabled)).toBe(true)
    expect(markup).toContain('01.08.26 - 20.08.26')
    expect(markup).toContain('aria-label="Другой период"')
    expect(markup.match(/<ion-datetime-button /g)).toHaveLength(2)
  })
})
