import { accountIconChartColor } from '@/components/AccountIcon'
import { categoryIconChartColor } from '@/components/CategoryIcon'
import type { CategoryType } from '@/api/categories'

export const TRANSFER_CHART_COLOR = 'var(--account-icon-color-blue)'
export const DASHBOARD_TOOLTIP_WIDTH = 152
export const DASHBOARD_TOOLTIP_HEIGHT = 72
const DASHBOARD_PIE_OUTER_RADIUS = 80
const DASHBOARD_TOOLTIP_OVERLAP = 8

export interface DashboardPieEntry {
  name: string
  amount: number
  transactionsHref?: string
  legendTransactionsHref?: string
  icon?: string
  iconType?: 'account' | 'category' | 'transfer'
  categoryType?: CategoryType
}

export interface DashboardChartEntry extends DashboardPieEntry {
  chartAmount: number
}

export function dashboardTooltipPosition({
  chartWidth,
  chartHeight,
  pointerX,
  pointerY,
  chartLeft = 0,
  chartTop = 0,
  viewportWidth = chartWidth,
  viewportHeight = chartHeight,
}: {
  chartWidth: number
  chartHeight: number
  pointerX: number
  pointerY: number
  chartLeft?: number
  chartTop?: number
  viewportWidth?: number
  viewportHeight?: number
}): { x: number; y: number } {
  const centerX = chartWidth / 2
  const centerY = chartHeight / 2
  const dx = pointerX - centerX
  const dy = pointerY - centerY
  const distance = Math.hypot(dx, dy) || 1
  const anchorX = centerX + (dx / distance) * DASHBOARD_PIE_OUTER_RADIUS
  const anchorY = centerY + (dy / distance) * DASHBOARD_PIE_OUTER_RADIUS

  const rawX = dx >= 0
    ? anchorX - DASHBOARD_TOOLTIP_OVERLAP
    : anchorX - DASHBOARD_TOOLTIP_WIDTH + DASHBOARD_TOOLTIP_OVERLAP
  const rawY = dy >= 0
    ? anchorY - DASHBOARD_TOOLTIP_OVERLAP
    : anchorY - DASHBOARD_TOOLTIP_HEIGHT + DASHBOARD_TOOLTIP_OVERLAP

  const viewportInset = 8
  const minX = viewportInset - chartLeft
  const maxX = viewportWidth - viewportInset - chartLeft - DASHBOARD_TOOLTIP_WIDTH
  const minY = viewportInset - chartTop
  const maxY = viewportHeight - viewportInset - chartTop - DASHBOARD_TOOLTIP_HEIGHT

  return {
    x: Math.round(Math.min(Math.max(rawX, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(rawY, minY), Math.max(minY, maxY))),
  }
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
