import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
export type NavigablePeriod = Exclude<Period, 'custom'>

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
  periodOffset: number
  customFrom: string
  customTo: string
  setPeriod: (p: Period) => void
  setPeriodOffset: (o: number | ((prev: number) => number)) => void
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
      periodOffset: 0,
      customFrom: fmtDate(new Date()),
      customTo: fmtDate(new Date()),
      setPeriod: (period) => set({ period, periodOffset: 0 }),
      setPeriodOffset: (o) => set((s) => ({ periodOffset: typeof o === 'function' ? o(s.periodOffset) : o })),
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

/** Return the relative offset of the period containing the selected calendar date. */
export function periodOffsetForDate(
  period: NavigablePeriod,
  isoDate: string,
  now = new Date(),
): number {
  const selected = parseDate(isoDate)
  if (!selected) return 0

  let offset: number
  if (period === 'day') {
    offset = dayNumber(selected) - dayNumber(now)
  } else if (period === 'week') {
    offset = (dayNumber(startOfWeek(selected)) - dayNumber(startOfWeek(now))) / 7
  } else if (period === 'month') {
    offset = (selected.getFullYear() - now.getFullYear()) * 12 + selected.getMonth() - now.getMonth()
  } else if (period === 'quarter') {
    const selectedQuarter = selected.getFullYear() * 4 + Math.floor(selected.getMonth() / 3)
    const currentQuarter = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3)
    offset = selectedQuarter - currentQuarter
  } else {
    offset = selected.getFullYear() - now.getFullYear()
  }

  return Math.min(0, offset)
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

function parseDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}

function dayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday)
}
