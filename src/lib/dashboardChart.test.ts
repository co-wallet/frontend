import { describe, expect, it } from 'vitest'

import { prepareDashboardChart } from './dashboardChart'

describe('dashboard chart data', () => {
  it('builds chart sectors when all account balances are negative', () => {
    const result = prepareDashboardChart([
      { name: 'Личная', amount: -100 },
      { name: 'Кредитная', amount: 0 },
    ])

    expect(result.chartEntries).toEqual([
      { name: 'Личная', amount: -100, chartAmount: 100 },
    ])
    expect(result.legendEntries.map((entry) => entry.name)).toEqual(['Личная', 'Кредитная'])
  })

  it('sorts signed values while keeping positive chart sector sizes', () => {
    const result = prepareDashboardChart([
      { name: 'Малый плюс', amount: 20 },
      { name: 'Большой минус', amount: -80 },
      { name: 'Большой плюс', amount: 50 },
      { name: 'Малый минус', amount: -10 },
    ])

    expect(result.legendEntries.map((entry) => entry.amount)).toEqual([50, 20, -80, -10])
    expect(result.chartEntries.map((entry) => entry.chartAmount)).toEqual([50, 20, 80, 10])
  })
})
