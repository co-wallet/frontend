import { describe, expect, it } from 'vitest'

import type { Account } from '@/api/accounts'

import {
  filterAccountsByKinds,
  resetTransactionFilter,
  selectedVisibleAccountIds,
  transactionAccountScope,
  transactionAccountScopeFilter,
  transactionAccountKinds,
  transactionAccountRestrictionLabels,
  transactionFilterAccounts,
  toggleAccountKind,
} from './accountFilters'

const accounts = [
  { id: 'spending', kind: 'spending', accessMode: 'personal' },
  { id: 'shared-spending', kind: 'spending', accessMode: 'shared' },
  { id: 'deposit', kind: 'deposit', accessMode: 'personal' },
  { id: 'investment', kind: 'investment', accessMode: 'personal' },
  { id: 'savings', kind: 'savings', accessMode: 'personal' },
  { id: 'savings_account', kind: 'savings_account', accessMode: 'personal' },
] as Account[]

describe('account analytics filters', () => {
  it('reports only effective kind and access restrictions', () => {
    expect(transactionAccountRestrictionLabels({})).toEqual(['Текущие средства', 'личные счета'])
    expect(transactionAccountRestrictionLabels({ accountKinds: [], includeShared: true })).toEqual([])
    expect(transactionAccountRestrictionLabels({ accountKinds: ['spending', 'savings', 'deposit', 'savings_account', 'investment'], includeShared: true })).toEqual([])
    expect(transactionAccountRestrictionLabels({ accountKinds: ['deposit'], includeShared: true })).toEqual(['Вклад'])
    expect(transactionAccountRestrictionLabels({ accountKinds: [], onlyShared: true })).toEqual(['общие счета'])
  })
  it('resets all restrictions while keeping transfer display preferences', () => {
    const result = resetTransactionFilter({ accountKinds: ['spending'], accountIds: ['spending'],
      onlyShared: true, categoryIds: ['food'], tagIds: ['home'], tagMode: 'and',
      withoutTags: true, types: ['expense'], includeTransferExpenses: true, includeTransferIncome: false })
    expect(result).toEqual({ accountKinds: [], includeShared: true,
      includeTransferExpenses: true, includeTransferIncome: false })
    expect(transactionFilterAccounts(accounts, result)).toEqual(accounts)
    expect(resetTransactionFilter({})).toEqual({ accountKinds: [], includeShared: true })
  })
  it('filters accounts by selected kinds', () => {
    expect(filterAccountsByKinds(accounts, ['spending']).map((account) => account.id)).toEqual([
      'spending',
      'shared-spending',
    ])
    expect(filterAccountsByKinds(accounts, ['deposit', 'investment']).map((account) => account.id)).toEqual([
      'deposit',
      'investment',
    ])
  })

  it('combines new types without changing legacy selections', () => {
    expect(filterAccountsByKinds(accounts, ['savings', 'savings_account']).map(a => a.id)).toEqual(['savings', 'savings_account'])
    expect(selectedVisibleAccountIds(filterAccountsByKinds(accounts, ['savings']), ['savings', 'deposit'])).toEqual(['savings'])
  })

  it('keeps selected IDs that remain visible for the active kinds', () => {
    expect(selectedVisibleAccountIds(accounts.slice(0, 2), ['spending', 'investment'])).toEqual(['spending'])
  })

  it('defaults transaction filters to personal spending accounts', () => {
    expect(transactionAccountKinds({})).toEqual(['spending'])
    expect(transactionFilterAccounts(accounts, {}).map((account) => account.id)).toEqual(['spending'])
  })

  it('maps personal, shared, and all account scopes to compatible filter flags', () => {
    expect(transactionAccountScope({})).toBe('personal')
    expect(transactionAccountScope({ includeShared: true })).toBe('all')
    expect(transactionAccountScope({ includeShared: true, onlyShared: true })).toBe('shared')
    expect(transactionAccountScopeFilter('personal')).toEqual({})
    expect(transactionAccountScopeFilter('shared')).toEqual({ includeShared: true, onlyShared: true })
    expect(transactionAccountScopeFilter('all')).toEqual({ includeShared: true })
  })

  it('filters all shared accounts as one scope without explicit account selections', () => {
    expect(transactionFilterAccounts(accounts, {
      accountKinds: ['spending'],
      includeShared: true,
      onlyShared: true,
    }).map((account) => account.id)).toEqual(['shared-spending'])
  })

  it('intersects explicitly selected accounts with kinds and shared visibility', () => {
    expect(transactionFilterAccounts(accounts, {
      accountKinds: ['spending', 'deposit'],
      includeShared: true,
      accountIds: ['shared-spending', 'deposit', 'investment'],
    }).map((account) => account.id)).toEqual(['shared-spending', 'deposit'])
    expect(transactionFilterAccounts(accounts, { accountKinds: [] }).map((account) => account.id))
      .toEqual(['spending', 'deposit', 'investment', 'savings', 'savings_account'])
  })

  it('shows all kinds for an empty selection while retaining scope and concrete-account restrictions', () => {
    expect(filterAccountsByKinds(accounts, [])).toEqual(accounts)
    expect(transactionFilterAccounts(accounts, { accountKinds: [], includeShared: true })).toEqual(accounts)
    expect(transactionFilterAccounts(accounts, { accountKinds: [], includeShared: true, onlyShared: true }))
      .toEqual([accounts[1]])
    expect(transactionFilterAccounts(accounts, { accountKinds: [], accountIds: ['deposit', 'shared-spending'] }))
      .toEqual([accounts[2]])
    expect(transactionAccountRestrictionLabels({ accountIds: ['deposit'], accountKinds: ['spending'] })).toEqual(['Текущие средства', 'личные счета'])
  })

  it('does not allow deselecting the last kind', () => {
    expect(toggleAccountKind(['spending'], 'spending')).toEqual(['spending'])
    expect(toggleAccountKind(['spending'], 'deposit')).toEqual(['spending', 'deposit'])
    expect(toggleAccountKind(['spending', 'deposit'], 'spending')).toEqual(['deposit'])
  })
})
