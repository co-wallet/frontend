import api from './axios'

export interface AnalyticsSummary {
  balance: number
  expenses: number
  income: number
}

export interface CategoryStat {
  categoryId: string
  categoryName: string
  icon?: string
  amount: number
}

export interface TagStat {
  tagId: string
  tagName: string
  amount: number
}

export interface AnalyticsParams {
  date_from?: string
  date_to?: string
  account_ids?: string
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
