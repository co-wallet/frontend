import { accountIconChartColor } from '@/components/AccountIcon'
import { categoryIconChartColor } from '@/components/CategoryIcon'
import type { CategoryType } from '@/api/categories'

export const TRANSFER_CHART_COLOR = 'var(--account-icon-color-blue)'

export interface DashboardPieEntry {
  name: string
  amount: number
  icon?: string
  iconType?: 'account' | 'category' | 'transfer'
  categoryType?: CategoryType
}

export interface DashboardChartEntry extends DashboardPieEntry {
  chartAmount: number
}

export function dashboardEntryColor(entry: DashboardPieEntry): string {
  if (entry.iconType === 'transfer') return TRANSFER_CHART_COLOR
  return entry.iconType === 'account'
    ? accountIconChartColor(entry.icon)
    : categoryIconChartColor(entry.icon, entry.categoryType)
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
