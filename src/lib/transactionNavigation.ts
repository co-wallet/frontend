import type { TransactionFilter, TransactionType } from '@/api/transactions'
import type { History, LocationDescriptorObject } from 'history'
import { isAccountKind } from '@/lib/accountKind'
import { PERIOD_LABELS, type Period } from '@/store/periodStore'
import type { AccountAccessMode, AccountKind } from '@/api/accounts'

export interface TransactionPeriod {
  period: Period
  periodOffset: number
  customFrom: string
  customTo: string
}

interface TransactionCreationState {
  transactionReturnTo: string
}

export interface TransactionCreationDefaults {
  type?: TransactionType
  accountId?: string
  date?: string
}

export function transactionCreationLocation(
  source: Pick<LocationDescriptorObject, 'pathname' | 'search'>,
  defaults: TransactionCreationDefaults = {},
): LocationDescriptorObject<TransactionCreationState> {
  const search = new URLSearchParams()
  if (defaults.type) search.set('type', defaults.type)
  if (defaults.accountId) search.set('account_id', defaults.accountId)
  if (defaults.date) search.set('date', defaults.date)
  return {
    pathname: '/transactions/add',
    search: search.toString(),
    state: { transactionReturnTo: `${source.pathname ?? ''}${source.search ?? ''}` },
  }
}

export function transactionCreationDefaults(params: URLSearchParams): TransactionCreationDefaults {
  const type = params.get('type')
  const accountId = params.get('account_id')?.trim()
  const date = params.get('date')
  return {
    ...(type === 'expense' || type === 'income' || type === 'transfer' ? { type } : {}),
    ...(accountId ? { accountId } : {}),
    ...(date && validDate(date) ? { date } : {}),
  }
}

export function transactionCreationReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('transactionReturnTo' in state)) return null
  const returnTo = (state as TransactionCreationState).transactionReturnTo
  return typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : null
}

export function finishTransactionCreation(
  history: Pick<History, 'goBack' | 'replace'>,
  state: unknown,
): void {
  if (transactionCreationReturnTo(state)) {
    history.goBack()
    return
  }
  history.replace('/transactions')
}

export function filterFromParams(params: URLSearchParams): TransactionFilter {
  const filter: TransactionFilter = {}
  for (const [key, field] of [
    ['account_ids', 'accountIds'], ['category_ids', 'categoryIds'], ['tag_ids', 'tagIds'],
  ] as const) {
    const values = params.get(key)?.split(',').filter(Boolean)
    if (values?.length) filter[field] = values
  }
  const types = params.get('types')?.split(',').filter(
    (type): type is TransactionType => type === 'expense' || type === 'income' || type === 'transfer',
  )
  if (types?.length) filter.types = [...new Set(types)]
  if (params.get('tag_mode') === 'and') filter.tagMode = 'and'
  if (params.get('without_tags') === 'true') filter.withoutTags = true
  const accountKinds = params.get('account_kinds')
  if (accountKinds === 'none') filter.accountKinds = []
  else if (accountKinds) {
    const validKinds = accountKinds.split(',').filter(isAccountKind)
    if (validKinds.length) filter.accountKinds = validKinds
  }
  if (params.get('include_shared') === 'true') filter.includeShared = true
  if (params.get('include_transfer_expenses') === 'true') filter.includeTransferExpenses = true
  if (params.get('include_transfer_income') === 'false') filter.includeTransferIncome = false
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
  result.delete('types')
  if (filter.types?.length) result.set('types', filter.types.join(','))
  result.delete('tag_mode')
  if (filter.tagMode === 'and') result.set('tag_mode', 'and')
  result.delete('without_tags')
  if (filter.withoutTags) result.set('without_tags', 'true')
  result.delete('account_kinds')
  if (filter.accountKinds) {
    result.set('account_kinds', filter.accountKinds.length ? filter.accountKinds.join(',') : 'none')
  }
  for (const [key, enabled] of [
    ['include_shared', filter.includeShared],
    ['include_transfer_expenses', filter.includeTransferExpenses],
  ] as const) {
    result.delete(key)
    if (enabled === true) result.set(key, 'true')
  }
  result.delete('include_transfer_income')
  if (filter.includeTransferIncome === false) result.set('include_transfer_income', 'false')
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

export function accountTransactionsHref(
  account: { id: string; kind: AccountKind; accessMode: AccountAccessMode },
  period: TransactionPeriod,
  sourcePath = '',
): string {
  return filteredTransactionsHref({
    accountIds: [account.id],
    accountKinds: [account.kind],
    ...(account.accessMode === 'shared' ? { includeShared: true } : {}),
  }, period, sourcePath)
}

export function categoryTransactionsHref(
  categoryId: string,
  baseFilter: TransactionFilter,
  period: TransactionPeriod,
  sourcePath = '',
): string | undefined {
  if (categoryId === 'uncategorized' || categoryId === 'transfers' || categoryId.startsWith('transfers:')) {
    return undefined
  }
  return filteredTransactionsHref({ ...baseFilter, categoryIds: [categoryId] }, period, sourcePath)
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
