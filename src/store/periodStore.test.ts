import { describe, expect, it } from 'vitest'
import { periodOffsetForDate } from './periodStore'

const now = new Date(2026, 8, 28, 12)

describe('periodOffsetForDate', () => {
  it.each([
    ['day', '2026-09-26', -2],
    ['week', '2026-09-20', -2],
    ['month', '2026-01-15', -8],
    ['quarter', '2025-12-31', -3],
    ['year', '2023-06-15', -3],
  ] as const)('finds the %s period containing a selected date', (period, date, expected) => {
    expect(periodOffsetForDate(period, date, now)).toBe(expected)
  })

  it('maps dates from the current period to zero', () => {
    expect(periodOffsetForDate('week', '2026-09-28', now)).toBe(0)
    expect(periodOffsetForDate('quarter', '2026-07-01', now)).toBe(0)
  })

  it('does not produce a future offset', () => {
    expect(periodOffsetForDate('day', '2026-09-29', now)).toBe(0)
    expect(periodOffsetForDate('year', '2027-01-01', now)).toBe(0)
  })

  it('falls back to the current period for an invalid date', () => {
    expect(periodOffsetForDate('month', '2026-02-31', now)).toBe(0)
  })
})
