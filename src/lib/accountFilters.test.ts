import { describe, expect, it } from 'vitest'

import type { Account } from '@/api/accounts'

import {
  filterAccountsByKinds,
  selectedVisibleAccountIds,
  transactionAccountKinds,
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

  it('intersects kinds, shared visibility, and explicitly selected accounts', () => {
    expect(transactionFilterAccounts(accounts, {
      accountKinds: ['spending', 'deposit'],
      includeShared: true,
      accountIds: ['shared-spending', 'deposit', 'investment'],
    }).map((account) => account.id)).toEqual(['shared-spending', 'deposit'])
    expect(transactionFilterAccounts(accounts, { accountKinds: [] })).toEqual([])
  })

  it('does not allow deselecting the last kind', () => {
    expect(toggleAccountKind(['spending'], 'spending')).toEqual(['spending'])
    expect(toggleAccountKind(['spending'], 'deposit')).toEqual(['spending', 'deposit'])
    expect(toggleAccountKind(['spending', 'deposit'], 'spending')).toEqual(['deposit'])
  })
})
