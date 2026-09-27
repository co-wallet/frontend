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

  it('uses presets only to stage range boundaries', () => {
    const { onChange } = renderPeriod('month', -5)
    const yearPreset = controls.buttons.find((button) => button['aria-label'] === 'Год')!
    yearPreset.onClick?.({} as Parameters<NonNullable<typeof yearPreset.onClick>>[0])
    expect(onChange).not.toHaveBeenCalled()
    expect(controls.modals[0].className).toBe('period-control-picker-modal')
  })

  it.each([
    ['day', 0, { period: 'day', periodOffset: 0, customFrom: '2026-09-28', customTo: '2026-09-28' }],
    ['month', -1, { period: 'month', periodOffset: -1, customFrom: '2026-08-01', customTo: '2026-08-31' }],
    ['year', -1, { period: 'year', periodOffset: -1, customFrom: '2025-01-01', customTo: '2025-12-31' }],
  ] as const)('applies a complete %s range using its native period mode', (period, offset, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 12))
    const { onChange, markup } = renderPeriod(period, offset)
    const datePicker = controls.datetimes[0]
    const apply = controls.buttons.find((button) => button['aria-label'] === 'Применить период')!

    expect(markup).toContain('aria-label="Выбрать период. Сейчас:')
    expect(datePicker.max).toBe('2026-09-28')
    apply.onClick?.({} as Parameters<NonNullable<typeof apply.onClick>>[0])

    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it('keeps an arbitrary range in custom mode', () => {
    const { onChange } = renderPeriod('custom')
    const apply = controls.buttons.find((button) => button['aria-label'] === 'Применить период')!
    apply.onClick?.({} as Parameters<NonNullable<typeof apply.onClick>>[0])
    expect(onChange).toHaveBeenCalledWith({
      period: 'custom',
      periodOffset: 0,
      customFrom: '2026-08-01',
      customTo: '2026-08-20',
    })
  })

  it('uses one calendar and exposes only day, month, and year presets', () => {
    const { markup } = renderPeriod('month')
    expect(controls.datetimes).toHaveLength(1)
    expect(controls.datetimes[0].presentation).toBe('date')
    expect(markup).toContain('aria-label="День"')
    expect(markup).toContain('aria-label="Месяц"')
    expect(markup).toContain('aria-label="Год"')
    expect(markup).not.toContain('Неделя')
    expect(markup).not.toContain('Квартал')
    expect(markup).not.toContain('Другой период')
    expect(markup).not.toContain('Пресет выбирает')
    expect(markup).toContain('aria-label="Начало периода:')
    expect(markup).toContain('aria-label="Конец периода:')
  })

  it('highlights every date in the selected range and emphasizes its boundaries', () => {
    renderPeriod('custom')
    const highlight = controls.datetimes[0].highlightedDates
    expect(typeof highlight).toBe('function')
    if (typeof highlight !== 'function') return

    expect(highlight('2026-07-31')).toBeUndefined()
    expect(highlight('2026-08-01')).toMatchObject({ backgroundColor: 'var(--ion-color-primary)' })
    expect(highlight('2026-08-10')).toMatchObject({ backgroundColor: 'rgba(var(--ion-color-primary-rgb), 0.18)' })
    expect(highlight('2026-08-20')).toMatchObject({ backgroundColor: 'var(--ion-color-primary)' })
  })
})
