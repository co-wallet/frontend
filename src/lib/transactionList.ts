import type { Account } from '@/api/accounts'
import type { AnalyticsParams } from '@/api/analytics'
import type { Transaction, TransactionFilter, TransactionType } from '@/api/transactions'
import type { Period } from '@/store/periodStore'

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Расход',
  income: 'Доход',
  transfer: 'Перевод',
}

export interface TransactionGroup {
  dateKey: string
  label: string
  items: Transaction[]
  total: number | null
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  maximumFractionDigits = 4,
): string {
  const normalizedAmount = Object.is(amount, -0) ? 0 : amount
  const minimumFractionDigits = Number.isInteger(normalizedAmount)
    ? 0
    : Math.min(2, maximumFractionDigits)

  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(normalizedAmount).replace('-', '−')
  } catch {
    const value = normalizedAmount.toLocaleString('ru-RU', {
      minimumFractionDigits,
      maximumFractionDigits,
    })
    return `${value} ${currency}`.replace('-', '−')
  }
}

export function formatTransactionAmount(
  amount: number,
  currency: string,
  type: TransactionType,
): string {
  const formatted = formatCurrencyAmount(Math.abs(amount), currency)
  if (type === 'income') return `+${formatted}`
  if (type === 'expense') return `−${formatted}`
  return formatted
}

export function transactionUserAmount(
  tx: Transaction,
  account: Account | undefined,
  currentUserId: string | undefined,
): number {
  if (account?.accessMode !== 'shared' || !currentUserId) return tx.amount
  return tx.shares?.find((share) => share.userId === currentUserId)?.amount ?? tx.amount
}

export function isSharedTransaction(
  tx: Transaction,
  account: Account | undefined,
  currentUserId: string | undefined,
): boolean {
  return account?.accessMode === 'shared'
    && currentUserId != null
    && tx.shares?.some((share) => share.userId === currentUserId)
}

export function transactionDefaultCurrencyAmount(
  tx: Transaction,
  account: Account | undefined,
  currentUserId: string | undefined,
  defaultCurrency: string,
): number | null {
  const userAmount = transactionUserAmount(tx, account, currentUserId)
  if (tx.currency === defaultCurrency) return userAmount
  if (tx.defaultCurrency !== defaultCurrency || tx.defaultCurrencyAmount == null) return null
  if (tx.amount === 0) return tx.defaultCurrencyAmount
  return tx.defaultCurrencyAmount * (userAmount / tx.amount)
}

export function formatTransactionDate(dateKey: string, now = new Date()): string {
  const date = new Date(`${dateKey}T12:00:00`)
  const todayKey = localDateKey(now)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayKey = localDateKey(yesterday)
  const dateText = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' as const }),
  })

  if (dateKey === todayKey) return `Сегодня, ${dateText}`
  if (dateKey === yesterdayKey) return `Вчера, ${dateText}`

  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dateText}`
}

export function formatPeriodControlLabel(
  period: Period,
  dateFrom: string,
  dateTo: string,
): string {
  const from = new Date(`${dateFrom}T12:00:00`)

  if (period === 'year') return String(from.getFullYear())
  if (period === 'quarter') return `${Math.floor(from.getMonth() / 3) + 1} кв. ${from.getFullYear()}`
  if (period === 'month') {
    const label = from.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
  }
  if (period === 'day' || dateFrom === dateTo) return formatNumericDate(dateFrom)
  return `${formatNumericDate(dateFrom, false)}–${formatNumericDate(dateTo)}`
}

export function groupTransactionsByDate(
  transactions: Transaction[],
  amountInDefaultCurrency: (tx: Transaction) => number | null,
  now = new Date(),
): TransactionGroup[] {
  const groups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const dateKey = tx.date.slice(0, 10)
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), tx])
  }

  return Array.from(groups.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((dateKey) => {
      const items = groups.get(dateKey) ?? []
      let total = 0
      let canShowTotal = false

      for (const tx of items) {
        if (tx.type === 'transfer') continue
        const amount = amountInDefaultCurrency(tx)
        if (amount == null) {
          canShowTotal = false
          total = 0
          break
        }
        canShowTotal = true
        total += tx.type === 'income' ? amount : -amount
      }

      return {
        dateKey,
        label: formatTransactionDate(dateKey, now),
        items,
        total: canShowTotal ? total : null,
      }
    })
}

export function buildTransactionAnalyticsParams(
  filter: TransactionFilter,
  dateFrom: string,
  dateTo: string,
  currency: string,
): AnalyticsParams {
  return {
    date_from: dateFrom,
    date_to: dateTo,
    currency,
    account_kinds: 'all',
    ...(filter.accountIds?.length ? { account_ids: filter.accountIds.join(',') } : {}),
    ...(filter.categoryIds?.length ? { category_ids: filter.categoryIds.join(',') } : {}),
    ...(filter.tagIds?.length ? {
      tag_ids: filter.tagIds.join(','),
      tag_mode: filter.tagMode ?? 'or',
    } : {}),
  }
}

export function hasTransactionFilters(filter: TransactionFilter): boolean {
  return Boolean(filter.accountIds?.length || filter.categoryIds?.length || filter.tagIds?.length)
}

function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatNumericDate(date: string, includeYear = true): string {
  const [year, month, day] = date.split('-')
  return includeYear ? `${day}.${month}.${year}` : `${day}.${month}`
}
