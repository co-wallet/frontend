import type { TransactionPeriod } from './transactionNavigation'

/** The calendar arrows and swipes share the same period boundaries. */
export function shiftPeriod(value: TransactionPeriod, direction: -1 | 1): Partial<TransactionPeriod> | null {
  if (value.period === 'custom' || (direction === 1 && value.periodOffset >= 0)) return null
  return { periodOffset: value.periodOffset + direction }
}
