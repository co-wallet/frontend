import { describe, expect, it } from 'vitest'
import type { Account, TransferAccount } from '@/api/accounts'
import { transferSourceAccounts, transferDestinationAccounts } from './transferAccounts'

const accounts = [
  { id: 'personal', accessMode: 'personal' },
  { id: 'shared', accessMode: 'shared' },
] as Account[]

const external = [{ id: 'foreign', ownerUsername: 'alice' }] as TransferAccount[]

describe('transfer account options', () => {
  it('adds external sources while preserving the saved order of own accounts', () => {
    expect(transferSourceAccounts(accounts, external).map(a => a.id)).toEqual(['personal', 'shared', 'foreign'])
  })
  it('deduplicates an account already in the accessible catalog', () => {
    expect(transferSourceAccounts(accounts, [...external, accounts[0]]).map(a => a.id)).toEqual(['personal', 'shared', 'foreign'])
  })
  it('permits personal or shared destinations for a foreign source', () => {
    expect(transferDestinationAccounts(accounts, external, 'foreign')).toEqual(accounts)
  })
  it('permits foreign destinations from a personal source and excludes that source', () => {
    expect(transferDestinationAccounts(accounts, external, 'personal').map(a => a.id)).toEqual(['shared', 'foreign'])
  })
  it('excludes foreign destinations from a shared source', () => {
    expect(transferDestinationAccounts(accounts, external, 'shared').map(a => a.id)).toEqual(['personal'])
  })
  it('allows topups even when the user only has a shared account', () => {
    expect(transferSourceAccounts(accounts.slice(1), external).map(a => a.id)).toEqual(['shared', 'foreign'])
  })
})
