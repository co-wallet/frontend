import type { Account, AccountKind } from '@/api/accounts'

export function filterAccountsByKinds(accounts: Account[], kinds: AccountKind[]): Account[] {
  return accounts.filter((account) => kinds.includes(account.kind))
}

export function selectedVisibleAccountIds(accounts: Account[], selectedIds: string[]): string[] {
  const visibleIds = new Set(accounts.map((account) => account.id))
  return selectedIds.filter((id) => visibleIds.has(id))
}

export function toggleAccountKind(kinds: AccountKind[], kind: AccountKind): AccountKind[] {
  if (!kinds.includes(kind)) {
    return [...kinds, kind]
  }
  return kinds.length === 1 ? kinds : kinds.filter((value) => value !== kind)
}
