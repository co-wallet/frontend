import { describe, expect, it } from 'vitest'
import { shiftPeriod } from './periodNavigation'
import type { TransactionPeriod } from './transactionNavigation'

const value: TransactionPeriod = { period: 'month', periodOffset: -1, customFrom: '', customTo: '' }

describe('shiftPeriod', () => {
  it.each(['day', 'week', 'month', 'quarter', 'year'] as const)('shifts %s by one selected period', period => {
    expect(shiftPeriod({ ...value, period }, -1)).toEqual({ periodOffset: -2 })
    expect(shiftPeriod({ ...value, period }, 1)).toEqual({ periodOffset: 0 })
  })

  it('stops at the current period but allows moving backwards', () => {
    expect(shiftPeriod({ ...value, periodOffset: 0 }, 1)).toBeNull()
    expect(shiftPeriod({ ...value, periodOffset: 0 }, -1)).toEqual({ periodOffset: -1 })
  })

  it('keeps arbitrary date ranges unchanged', () => {
    const custom = { ...value, period: 'custom' as const, customFrom: '2026-08-01', customTo: '2026-08-20' }
    expect(shiftPeriod(custom, -1)).toBeNull()
    expect(shiftPeriod(custom, 1)).toBeNull()
  })
})
