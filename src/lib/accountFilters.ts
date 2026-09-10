import type { Account, AccountKind } from '@/api/accounts'
import type { TransactionFilter } from '@/api/transactions'

export const DEFAULT_TRANSACTION_ACCOUNT_KINDS: AccountKind[] = ['spending']

export function filterAccountsByKinds(accounts: Account[], kinds: AccountKind[]): Account[] {
  return accounts.filter((account) => kinds.includes(account.kind))
}

export function selectedVisibleAccountIds(accounts: Account[], selectedIds: string[]): string[] {
  const visibleIds = new Set(accounts.map((account) => account.id))
  return selectedIds.filter((id) => visibleIds.has(id))
}

export function transactionAccountKinds(filter: TransactionFilter): AccountKind[] {
  return filter.accountKinds ?? DEFAULT_TRANSACTION_ACCOUNT_KINDS
}

export function transactionFilterAccounts(
  accounts: Account[],
  filter: TransactionFilter,
): Account[] {
  const visibleAccounts = filterAccountsByKinds(accounts, transactionAccountKinds(filter))
    .filter((account) => filter.includeShared === true || account.accessMode !== 'shared')

  if (!filter.accountIds?.length) return visibleAccounts
  const selectedIds = new Set(filter.accountIds)
  return visibleAccounts.filter((account) => selectedIds.has(account.id))
}

export function toggleAccountKind(kinds: AccountKind[], kind: AccountKind): AccountKind[] {
  if (!kinds.includes(kind)) {
    return [...kinds, kind]
  }
  return kinds.length === 1 ? kinds : kinds.filter((value) => value !== kind)
}
