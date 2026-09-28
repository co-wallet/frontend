import type { TransactionType } from '@/api/transactions'

export function needsDefaultCurrencyAmount(
  type: TransactionType,
  sourceCurrency: string,
  destinationCurrency: string,
  defaultCurrency: string,
): boolean {
  if (!sourceCurrency || sourceCurrency === defaultCurrency) return false

  return type !== 'transfer' || destinationCurrency !== defaultCurrency
}
