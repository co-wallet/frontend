import { describe, expect, it } from 'vitest'
import { needsDefaultCurrencyAmount } from './transactionAmounts'

describe('needsDefaultCurrencyAmount', () => {
  it.each([
    { type: 'transfer' as const, source: 'RUB', destination: 'USD', expected: false },
    { type: 'transfer' as const, source: 'USD', destination: 'RUB', expected: false },
    { type: 'transfer' as const, source: 'USD', destination: 'EUR', expected: false },
    { type: 'transfer' as const, source: 'USD', destination: 'USD', expected: false },
    { type: 'expense' as const, source: 'USD', destination: '', expected: true },
    { type: 'income' as const, source: 'RUB', destination: '', expected: false },
    { type: 'expense' as const, source: '', destination: '', expected: false },
  ])('$type $source → $destination returns $expected', ({ type, source, expected }) => {
    expect(needsDefaultCurrencyAmount(type, source, 'RUB')).toBe(expected)
  })
})
