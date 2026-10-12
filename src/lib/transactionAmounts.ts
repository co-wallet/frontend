import type { TransactionType } from '@/api/transactions'

export function needsDefaultCurrencyAmount(
  type: TransactionType,
  sourceCurrency: string,
  defaultCurrency: string,
): boolean {
  return type !== 'transfer' && !!sourceCurrency && sourceCurrency !== defaultCurrency
}
