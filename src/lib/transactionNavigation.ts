import type { TransactionFilter } from '@/api/transactions'
import { PERIOD_LABELS, type Period } from '@/store/periodStore'

export interface TransactionPeriod {
  period: Period
  periodOffset: number
  customFrom: string
  customTo: string
}

export function filterFromParams(params: URLSearchParams): TransactionFilter {
  const filter: TransactionFilter = {}
  for (const [key, field] of [
    ['account_ids', 'accountIds'], ['category_ids', 'categoryIds'], ['tag_ids', 'tagIds'],
  ] as const) {
    const values = params.get(key)?.split(',').filter(Boolean)
    if (values?.length) filter[field] = values
  }
  if (params.get('tag_mode') === 'and') filter.tagMode = 'and'
  return filter
}

export function filterToParams(filter: TransactionFilter, params = new URLSearchParams()): URLSearchParams {
  const result = new URLSearchParams(params)
  for (const [key, values] of [
    ['account_ids', filter.accountIds], ['category_ids', filter.categoryIds], ['tag_ids', filter.tagIds],
  ] as const) {
    result.delete(key)
    if (values?.length) result.set(key, values.join(','))
  }
  result.delete('tag_mode')
  if (filter.tagMode === 'and') result.set('tag_mode', 'and')
  return result
}

export function periodToParams(value: TransactionPeriod, params = new URLSearchParams()): URLSearchParams {
  const result = new URLSearchParams(params)
  result.set('period', value.period)
  result.set('offset', String(value.periodOffset))
  result.set('from', value.customFrom)
  result.set('to', value.customTo)
  return result
}

export function periodFromParams(params: URLSearchParams, fallback: TransactionPeriod): TransactionPeriod {
  const period = params.get('period')
  if (!period || !Object.prototype.hasOwnProperty.call(PERIOD_LABELS, period)) return fallback
  const customFrom = params.get('from') || fallback.customFrom
  const customTo = params.get('to') || fallback.customTo
  if (period === 'custom' && (!validDate(customFrom) || !validDate(customTo) || customFrom > customTo)) return fallback
  const offset = Number(params.get('offset') ?? 0)
  return {
    period: period as Period,
    periodOffset: Number.isSafeInteger(offset) && offset <= 0 && offset >= -10000 ? offset : 0,
    customFrom,
    customTo,
  }
}

export function filteredTransactionsHref(
  filter: TransactionFilter,
  period: TransactionPeriod,
  sourcePath = '',
): string {
  const depth = Number(sourcePath.match(/^\/transactions\/filtered\/(\d+)$/)?.[1] ?? 0)
  return `/transactions/filtered/${depth + 1}?${periodToParams(period, filterToParams(filter))}`
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
