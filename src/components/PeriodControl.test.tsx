import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { IonButton, IonDatetime, IonModal } from '@ionic/react'
import { PeriodControl } from './PeriodControl'
import type { Period } from '@/store/periodStore'

const controls = vi.hoisted(() => ({
  buttons: [] as ComponentProps<typeof IonButton>[],
  datetimes: [] as ComponentProps<typeof IonDatetime>[],
  modals: [] as ComponentProps<typeof IonModal>[],
}))
vi.mock('@ionic/react', async (importOriginal) => {
  const ionic = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...ionic,
    IonButton: (props: ComponentProps<typeof IonButton>) => {
      controls.buttons.push(props)
      return <ionic.IonButton {...props} />
    },
    IonDatetime: (props: ComponentProps<typeof IonDatetime>) => {
      controls.datetimes.push(props)
      return <ionic.IonDatetime {...props} />
    },
    IonModal: (props: ComponentProps<typeof IonModal>) => {
      controls.modals.push(props)
      return <ionic.IonModal {...props} />
    },
  }
})
afterEach(() => {
  controls.buttons = []
  controls.datetimes = []
  controls.modals = []
  vi.useRealTimers()
})

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
    const quarterPreset = controls.buttons.find((button) => button['aria-label'] === 'Текущий квартал')!
    quarterPreset.onClick?.({} as Parameters<NonNullable<typeof quarterPreset.onClick>>[0])
    expect(onChange).toHaveBeenCalledWith({ period: 'quarter', periodOffset: 0 })
    expect(controls.modals[0].className).toBe('period-control-picker-modal')
  })

  it.each([
    ['day', '2026-09-20', -8],
    ['week', '2026-09-20', -2],
    ['month', '2026-08', -1],
    ['year', '2025', -1],
  ] as const)('selects a %s period from its picker', (period, selectedDate, expectedOffset) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 12))
    const { onChange, markup } = renderPeriod(period, 0)
    const datePicker = controls.datetimes[0]

    expect(markup).toContain('aria-label="Выбрать период. Сейчас:')
    expect(datePicker.max).toBe('2026-09-28')
    datePicker.onIonChange?.({ detail: { value: selectedDate } } as Parameters<NonNullable<typeof datePicker.onIonChange>>[0])

    expect(onChange).toHaveBeenCalledWith({ periodOffset: expectedOffset })
  })

  it.each([
    ['day', 'date'],
    ['week', 'date'],
    ['month', 'month-year'],
    ['year', 'year'],
  ] as const)('uses the appropriate %s picker presentation', (period, presentation) => {
    renderPeriod(period)
    expect(controls.datetimes[0].presentation).toBe(presentation)
  })

  it('offers quarters for a selected year and disables future quarters', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 12))
    const previous = renderPeriod('quarter', -3)
    const secondQuarter = controls.buttons.find((button) => button['aria-label'] === '2 квартал 2025')!
    secondQuarter.onClick?.({} as Parameters<NonNullable<typeof secondQuarter.onClick>>[0])
    expect(previous.onChange).toHaveBeenCalledWith({ periodOffset: -5 })

    controls.buttons = []
    renderPeriod('quarter', 0)
    expect(controls.buttons.find((button) => button['aria-label'] === '4 квартал 2026')?.disabled).toBe(true)
  })

  it('uses explicit dates and disables both arrows for a custom period', () => {
    const { markup } = renderPeriod('custom')
    expect(controls.buttons.find((button) => button['aria-label'] === 'Предыдущий период')?.disabled).toBe(true)
    expect(controls.buttons.find((button) => button['aria-label'] === 'Следующий период')?.disabled).toBe(true)
    expect(markup).toContain('01.08.26 - 20.08.26')
    expect(markup).toContain('aria-label="Другой период"')
    expect(markup.match(/<ion-datetime-button /g)).toHaveLength(2)
    expect(controls.datetimes).toHaveLength(2)
  })
})
