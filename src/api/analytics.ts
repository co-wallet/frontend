import { apiClient as api } from './client'

export interface AnalyticsSummary {
  expensesMissingAmounts?: number
  incomeMissingAmounts?: number
  balance: number
  expenses: number
  income: number
}

export interface CategoryStat {
  categoryId: string
  categoryName: string
  icon?: string
  amount: number
  missingAmounts?: number
}

export interface TagStat {
  tagId: string
  tagName: string
  amount: number
  missingAmounts?: number
}

export interface AnalyticsParams {
  include_transfer_expenses?: boolean
  include_transfer_income?: boolean
  date_from?: string
  date_to?: string
  account_ids?: string
  account_kinds?: string
  category_ids?: string
  tag_ids?: string
  tag_mode?: 'or' | 'and'
  currency?: string
  type?: string
}

export const analyticsApi = {
  summary(params: AnalyticsParams): Promise<AnalyticsSummary> {
    return api.get('/analytics/summary', { params }).then((r) => r.data)
  },
  byCategory(params: AnalyticsParams): Promise<CategoryStat[]> {
    return api.get('/analytics/by-category', { params }).then((r) => r.data)
  },
  byTag(params: AnalyticsParams): Promise<TagStat[]> {
    return api.get('/analytics/by-tag', { params }).then((r) => r.data)
  },
}
