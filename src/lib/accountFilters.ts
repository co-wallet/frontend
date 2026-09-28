import type { Account, AccountKind } from '@/api/accounts'
import type { TransactionFilter } from '@/api/transactions'

export const DEFAULT_TRANSACTION_ACCOUNT_KINDS: AccountKind[] = ['spending']
export type TransactionAccountScope = 'personal' | 'shared' | 'all'

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

export function transactionAccountScope(filter: TransactionFilter): TransactionAccountScope {
  if (filter.onlyShared) return 'shared'
  return filter.includeShared ? 'all' : 'personal'
}

export function transactionAccountScopeFilter(
  scope: TransactionAccountScope,
): Pick<TransactionFilter, 'includeShared' | 'onlyShared'> {
  if (scope === 'shared') return { includeShared: true, onlyShared: true }
  if (scope === 'all') return { includeShared: true }
  return {}
}

export function transactionFilterAccounts(
  accounts: Account[],
  filter: TransactionFilter,
): Account[] {
  const scope = transactionAccountScope(filter)
  const visibleAccounts = filterAccountsByKinds(accounts, transactionAccountKinds(filter))
    .filter((account) => scope === 'all' || account.accessMode === scope)

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
