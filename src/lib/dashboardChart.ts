import { getAccountIconColor } from '@/components/AccountIcon'

export interface DashboardPieEntry {
  name: string
  amount: number
  icon?: string
  iconType?: 'account' | 'category'
}

export interface DashboardChartEntry extends DashboardPieEntry {
  chartAmount: number
}

export function dashboardEntryColor(entry: DashboardPieEntry, fallbackColor: string): string {
  if (entry.iconType === 'account') return getAccountIconColor(entry.icon)
  return entry.amount < 0 ? 'var(--ion-color-danger)' : fallbackColor
}

export function prepareDashboardChart(data: DashboardPieEntry[]): {
  legendEntries: DashboardPieEntry[]
  chartEntries: DashboardChartEntry[]
} {
  const positive = data.filter((entry) => entry.amount > 0).sort((a, b) => b.amount - a.amount)
  const negative = data.filter((entry) => entry.amount < 0).sort((a, b) => a.amount - b.amount)
  const zero = data.filter((entry) => entry.amount === 0)
  const legendEntries = [...positive, ...negative, ...zero]

  return {
    legendEntries,
    chartEntries: legendEntries
      .filter((entry) => entry.amount !== 0)
      .map((entry) => ({ ...entry, chartAmount: Math.abs(entry.amount) })),
  }
}
