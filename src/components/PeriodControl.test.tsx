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
  it.each(['day', 'month', 'year'] as const)('moves the selected %s backward and forward', (period) => {
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
    const yearPreset = controls.buttons.find((button) => button['aria-label'] === 'Текущий год')!
    yearPreset.onClick?.({} as Parameters<NonNullable<typeof yearPreset.onClick>>[0])
    expect(onChange).toHaveBeenCalledWith({ period: 'year', periodOffset: 0 })
    expect(controls.modals[0].className).toBe('period-control-picker-modal')
  })

  it.each([
    ['day', '2026-09-20', -8],
    ['month', '2026-08-20', -1],
    ['year', '2025-04-20', -1],
  ] as const)('selects a %s period from its picker', (period, selectedDate, expectedOffset) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 12))
    const { onChange, markup } = renderPeriod(period, 0)
    const datePicker = controls.datetimes[0]

    expect(markup).toContain('aria-label="Выбрать период. Сейчас:')
    expect(datePicker.max).toBe('2026-09-28')
    datePicker.onIonChange?.({ detail: { value: selectedDate } } as Parameters<NonNullable<typeof datePicker.onIonChange>>[0])

    expect(onChange).toHaveBeenCalledWith({ period, periodOffset: expectedOffset })
  })

  it('uses one calendar and exposes only day, month, and year presets', () => {
    const { markup } = renderPeriod('month')
    expect(controls.datetimes).toHaveLength(1)
    expect(controls.datetimes[0].presentation).toBe('date')
    expect(markup).toContain('Текущий день')
    expect(markup).toContain('Текущий месяц')
    expect(markup).toContain('Текущий год')
    expect(markup).not.toContain('Текущая неделя')
    expect(markup).not.toContain('Текущий квартал')
    expect(markup).not.toContain('Другой период')
  })
})
