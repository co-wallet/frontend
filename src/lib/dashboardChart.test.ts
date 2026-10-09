import { describe, expect, it } from 'vitest'

import {
  DASHBOARD_TOOLTIP_WIDTH,
  dashboardEntryColor,
  dashboardTooltipPosition,
  prepareDashboardChart,
  type DashboardPieEntry,
} from './dashboardChart'

describe('dashboard chart data', () => {
  it.each(['account', 'category'] as const)(
    'uses the graphite %s icon border for both sectors and legend markers',
    (iconType) => {
      const { chartEntries, legendEntries } = prepareDashboardChart([
        { name: 'Обводка', amount: 80, iconType, icon: 'preset:coins|graphite|orange' },
        { name: 'Без обводки', amount: 50, iconType, icon: 'preset:coins|graphite|none' },
      ])
      for (const entries of [chartEntries, legendEntries]) {
        expect(entries.map(dashboardEntryColor)).toEqual([
          'var(--account-icon-color-orange)',
          'var(--account-icon-color-graphite)',
        ])
      }
    },
  )

  it.each([
    ['preset:cash|green|purple', 'var(--account-icon-color-green)'],
    ['custom:TBank|yellow|none', 'var(--account-icon-color-yellow)'],
    [undefined, 'var(--account-icon-color-blue)'],
    ['preset:cash|invalid|red', 'var(--account-icon-color-blue)'],
  ])('uses the icon foreground for account %s regardless of balance or position', (icon, color) => {
    for (const amount of [100, -100, 0]) {
      const entry: DashboardPieEntry = { name: 'Счёт', amount, iconType: 'account', icon }
      expect(dashboardEntryColor(entry)).toBe(color)
    }
  })

  it('keeps sector and legend colors tied to accounts after sorting and filtering zeros', () => {
    const data: DashboardPieEntry[] = [
      { name: 'Долг', amount: -80, iconType: 'account', icon: 'preset:cash|green|red' },
      { name: 'Пустой', amount: 0, iconType: 'account', icon: 'preset:cash|yellow|blue' },
      { name: 'Основной', amount: 50, iconType: 'account', icon: 'custom:Bank|purple|none' },
    ]
    const { chartEntries, legendEntries } = prepareDashboardChart(data)
    expect(chartEntries.map((entry) => dashboardEntryColor(entry))).toEqual([
      'var(--account-icon-color-purple)',
    ])
    for (const sector of chartEntries) {
      const legend = legendEntries.find((entry) => entry.name === sector.name)!
      expect(dashboardEntryColor(sector)).toBe(dashboardEntryColor(legend))
    }
    const filtered = prepareDashboardChart(data.filter((entry) => entry.name === 'Долг'))
    expect(filtered.chartEntries).toEqual([])
    expect(dashboardEntryColor(filtered.legendEntries[0])).toBe('var(--account-icon-color-green)')
  })

  it.each(['expense', 'income'] as const)('uses category colors for %s charts', (categoryType) => {
    const entry: DashboardPieEntry = {
      name: 'Категория', amount: 10, iconType: 'category', categoryType,
      icon: 'preset:salary|green|red',
    }
    expect(dashboardEntryColor(entry)).toBe('var(--account-icon-color-green)')
    expect(dashboardEntryColor({ ...entry, icon: 'preset:salary|yellow|none' }))
      .toBe('var(--account-icon-color-yellow)')
    expect(dashboardEntryColor({ ...entry, amount: -10 }))
      .toBe('var(--account-icon-color-green)')
  })

  it('keeps negative and zero accounts in the legend without building sectors', () => {
    const result = prepareDashboardChart([
      { name: 'Личная', amount: -100 },
      { name: 'Кредитная', amount: 0 },
    ])

    expect(result.chartEntries).toEqual([])
    expect(result.legendEntries.map((entry) => entry.name)).toEqual(['Личная', 'Кредитная'])
  })

  it('sorts signed legend values while only charting positive balances', () => {
    const result = prepareDashboardChart([
      { name: 'Малый плюс', amount: 20 },
      { name: 'Большой минус', amount: -80 },
      { name: 'Большой плюс', amount: 50 },
      { name: 'Малый минус', amount: -10 },
    ])

    expect(result.legendEntries.map((entry) => entry.amount)).toEqual([50, 20, -80, -10])
    expect(result.chartEntries.map((entry) => entry.chartAmount)).toEqual([50, 20])
    expect(result.chartEntries.map((entry) => entry.name)).toEqual(['Большой плюс', 'Малый плюс'])
  })

  it('preserves positive sector data and negative account navigation without mutating inputs', () => {
    const positive = { name: 'Актив', amount: 0.01, iconType: 'account' as const, transactionsHref: '/transactions?account_ids=asset' }
    const negative = { name: 'Долг', amount: -10, iconType: 'account' as const, legendTransactionsHref: '/transactions?account_ids=debt' }
    const data = [negative, positive]
    const result = prepareDashboardChart(data)

    expect(result.chartEntries).toEqual([{ ...positive, chartAmount: 0.01 }])
    expect(result.legendEntries).toEqual([positive, negative])
    expect(data).toEqual([negative, positive])
    expect(positive).not.toHaveProperty('chartAmount')
  })

  it.each([{ data: [] }, { data: [{ name: 'Пустой', amount: 0 }] }])('returns no sectors for empty or zero balances: $data', ({ data }) => {
    expect(prepareDashboardChart(data)).toEqual({ legendEntries: data, chartEntries: [] })
  })
})

describe('dashboard tooltip position', () => {
  it.each([
    ['upper right', 220, 70, 200, 0],
    ['lower right', 220, 130, 200, 128],
    ['upper left', 100, 70, -32, 0],
    ['lower left', 100, 130, -32, 128],
  ] as const)('attaches the nearest tooltip corner outside the %s sector', (_name, pointerX, pointerY, x, y) => {
    expect(dashboardTooltipPosition({
      chartWidth: 320,
      chartHeight: 200,
      pointerX,
      pointerY,
      chartLeft: 40,
      chartTop: 100,
      viewportWidth: 400,
      viewportHeight: 500,
    })).toEqual({ x, y })
  })

  it('keeps an outward tooltip inside the viewport even when it leaves the chart', () => {
    const position = dashboardTooltipPosition({
      chartWidth: 300,
      chartHeight: 200,
      pointerX: 80,
      pointerY: 100,
      chartLeft: 16,
      chartTop: 120,
      viewportWidth: 320,
      viewportHeight: 640,
    })
    expect(position.x).toBe(-8)
    expect(position.x + 16).toBe(8)
    expect(position.x + DASHBOARD_TOOLTIP_WIDTH).toBeLessThan(150)
  })
})


describe('transfer colors', () => {
  it.each(['expense', 'income'] as const)('always uses blue for %s transfers', (categoryType) => {
    const entries: DashboardPieEntry[] = [
      { name: "В 'Банк'", amount: 30, iconType: 'transfer', categoryType, icon: 'preset:salary|red|red' },
      { name: "Из 'Другой банк'", amount: 10, iconType: 'transfer', categoryType },
    ]
    const { chartEntries, legendEntries } = prepareDashboardChart(entries)
    for (const entry of [...chartEntries, ...legendEntries]) {
      expect(dashboardEntryColor(entry)).toBe('var(--account-icon-color-blue)')
    }
  })
})
