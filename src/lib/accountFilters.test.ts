import { describe, expect, it } from 'vitest'

import type { Account } from '@/api/accounts'

import {
  filterAccountsByKinds,
  selectedVisibleAccountIds,
  toggleAccountKind,
} from './accountFilters'

const accounts = [
  { id: 'spending', kind: 'spending' },
  { id: 'deposit', kind: 'deposit' },
  { id: 'investment', kind: 'investment' },
] as Account[]

describe('account analytics filters', () => {
  it('filters accounts by selected kinds', () => {
    expect(filterAccountsByKinds(accounts, ['spending']).map((account) => account.id)).toEqual(['spending'])
    expect(filterAccountsByKinds(accounts, ['deposit', 'investment']).map((account) => account.id)).toEqual([
      'deposit',
      'investment',
    ])
  })

  it('keeps selected IDs that remain visible for the active kinds', () => {
    expect(selectedVisibleAccountIds(accounts.slice(0, 2), ['spending', 'investment'])).toEqual(['spending'])
  })

  it('does not allow deselecting the last kind', () => {
    expect(toggleAccountKind(['spending'], 'spending')).toEqual(['spending'])
    expect(toggleAccountKind(['spending'], 'deposit')).toEqual(['spending', 'deposit'])
    expect(toggleAccountKind(['spending', 'deposit'], 'spending')).toEqual(['deposit'])
  })
})
