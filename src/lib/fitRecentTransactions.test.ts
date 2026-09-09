import { describe, expect, it } from 'vitest'
import { fitRecentTransactions } from './fitRecentTransactions'

describe('fitRecentTransactions', () => {
  it('reserves the header and full-list button before fitting rows', () => {
    expect(fitRecentTransactions(260, 48, 52, [80, 60, 80])).toBe(2)
  })
  it('never shows a partial row, including its date heading', () => {
    expect(fitRecentTransactions(179, 48, 52, [80, 60])).toBe(0)
    expect(fitRecentTransactions(180, 48, 52, [80, 60])).toBe(1)
  })
  it('adapts to a shrinking or expanding viewport', () => {
    const rows = [80, 60, 80, 60, 60]
    expect(fitRecentTransactions(240, 48, 52, rows)).toBe(2)
    expect(fitRecentTransactions(440, 48, 52, rows)).toBe(5)
    expect(fitRecentTransactions(80, 48, 52, rows)).toBe(0)
  })
  it('accounts for taller rows with currency conversions and shared amounts', () => {
    expect(fitRecentTransactions(280, 48, 52, [110, 90, 60])).toBe(1)
  })
  it('handles empty and insufficient space', () => {
    expect(fitRecentTransactions(500, 48, 52, [])).toBe(0)
    expect(fitRecentTransactions(0, 48, 52, [60])).toBe(0)
  })
})
