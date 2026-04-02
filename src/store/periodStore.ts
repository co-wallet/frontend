import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
  custom: 'Период',
}

interface PeriodState {
  period: Period
  customFrom: string
  customTo: string
  setPeriod: (p: Period) => void
  setCustomFrom: (d: string) => void
  setCustomTo: (d: string) => void
}

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({
      period: 'month',
      customFrom: fmtDate(new Date()),
      customTo: fmtDate(new Date()),
      setPeriod: (period) => set({ period }),
      setCustomFrom: (customFrom) => set({ customFrom }),
      setCustomTo: (customTo) => set({ customTo }),
    }),
    { name: 'period-storage' },
  ),
)

/** Compute date range for a period with an optional offset (e.g. -1 = previous period). */
export function computeDateRange(
  period: Period,
  offset: number,
  customFrom: string,
  customTo: string,
): { dateFrom: string; dateTo: string } {
  if (period === 'custom') {
    return { dateFrom: customFrom || fmtDate(new Date()), dateTo: customTo || fmtDate(new Date()) }
  }

  const now = new Date()
  let from: Date
  let to: Date

  if (period === 'day') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    from = d
    to = d
  } else if (period === 'week') {
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff + offset * 7)
    from = weekStart
    to = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  } else if (period === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3
    from = new Date(now.getFullYear(), qStart + offset * 3, 1)
    to = new Date(now.getFullYear(), qStart + offset * 3 + 3, 0)
  } else {
    // year
    from = new Date(now.getFullYear() + offset, 0, 1)
    to = new Date(now.getFullYear() + offset, 11, 31)
  }

  // Clamp future end dates to today
  if (offset === 0 && to > now) {
    to = now
  }

  return { dateFrom: fmtDate(from), dateTo: fmtDate(to) }
}

/** Format a human-readable label for the period at a given offset. */
export function periodLabel(period: Period, offset: number, customFrom: string, customTo: string): string {
  if (period === 'custom') {
    return `${formatShort(customFrom)} – ${formatShort(customTo)}`
  }

  const { dateFrom, dateTo } = computeDateRange(period, offset, '', '')
  const from = new Date(dateFrom + 'T00:00:00')

  if (period === 'day') {
    return from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (period === 'week') {
    return `${formatShort(dateFrom)} – ${formatShort(dateTo)}`
  }
  if (period === 'month') {
    const label = from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  if (period === 'quarter') {
    const q = Math.floor(from.getMonth() / 3) + 1
    return `${q}-й квартал ${from.getFullYear()}`
  }
  // year
  return String(from.getFullYear())
}

function formatShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
