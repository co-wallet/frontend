import { describe, expect, it } from 'vitest'

import type { Account } from '@/api/accounts'

import {
  filterAccountsByKinds,
  selectedVisibleAccountIds,
  toggleAccountKind,
} from './accountFilters'

const accounts = [
  { id: 'current', kind: 'current' },
  { id: 'deposit', kind: 'deposit' },
  { id: 'investment', kind: 'investment' },
] as Account[]

describe('account analytics filters', () => {
  it('filters accounts by selected kinds', () => {
    expect(filterAccountsByKinds(accounts, ['current']).map((account) => account.id)).toEqual(['current'])
    expect(filterAccountsByKinds(accounts, ['deposit', 'investment']).map((account) => account.id)).toEqual([
      'deposit',
      'investment',
    ])
  })

  it('keeps selected IDs that remain visible for the active kinds', () => {
    expect(selectedVisibleAccountIds(accounts.slice(0, 2), ['current', 'investment'])).toEqual(['current'])
  })

  it('does not allow deselecting the last kind', () => {
    expect(toggleAccountKind(['current'], 'current')).toEqual(['current'])
    expect(toggleAccountKind(['current'], 'deposit')).toEqual(['current', 'deposit'])
    expect(toggleAccountKind(['current', 'deposit'], 'current')).toEqual(['deposit'])
  })
})
