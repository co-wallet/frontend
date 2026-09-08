import { describe, expect, it } from 'vitest'

import { dashboardEntryColor, prepareDashboardChart, type DashboardPieEntry } from './dashboardChart'

describe('dashboard chart data', () => {
  it.each([
    ['preset:cash|green|purple', 'var(--account-icon-color-green)'],
    ['custom:TBank|yellow|none', 'var(--account-icon-foreground-yellow)'],
    ['preset:cash|teal|red', 'var(--account-icon-foreground-yellow)'],
    ['💵', 'var(--account-icon-color-blue)'],
    [undefined, 'var(--account-icon-color-blue)'],
    ['preset:cash|invalid|red', 'var(--account-icon-color-blue)'],
  ])('uses the icon foreground for account %s regardless of balance or position', (icon, color) => {
    for (const amount of [100, -100, 0]) {
      const entry: DashboardPieEntry = { name: 'Счёт', amount, iconType: 'account', icon }
      expect(dashboardEntryColor(entry, 'red')).toBe(color)
      expect(dashboardEntryColor(entry, 'purple')).toBe(color)
    }
  })

  it('keeps sector and legend colors tied to accounts after sorting and filtering zeros', () => {
    const data: DashboardPieEntry[] = [
      { name: 'Долг', amount: -80, iconType: 'account', icon: 'preset:cash|green|red' },
      { name: 'Пустой', amount: 0, iconType: 'account', icon: 'preset:cash|yellow|blue' },
      { name: 'Основной', amount: 50, iconType: 'account', icon: 'custom:Bank|purple|none' },
    ]
    const { chartEntries, legendEntries } = prepareDashboardChart(data)
    expect(chartEntries.map((entry) => dashboardEntryColor(entry, 'fallback'))).toEqual([
      'var(--account-icon-color-purple)', 'var(--account-icon-color-green)',
    ])
    for (const sector of chartEntries) {
      const legend = legendEntries.find((entry) => entry.name === sector.name)!
      expect(dashboardEntryColor(sector, 'sector')).toBe(dashboardEntryColor(legend, 'legend'))
    }
    const filtered = prepareDashboardChart(data.filter((entry) => entry.name === 'Долг'))
    expect(dashboardEntryColor(filtered.chartEntries[0], 'fallback')).toBe('var(--account-icon-color-green)')
  })

  it('preserves palette colors for category charts', () => {
    expect(dashboardEntryColor({ name: 'Еда', amount: 10, iconType: 'category', icon: 'preset:food|green|red' }, 'palette')).toBe('palette')
    expect(dashboardEntryColor({ name: 'Еда', amount: -10, iconType: 'category' }, 'palette')).toBe('var(--ion-color-danger)')
  })

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
