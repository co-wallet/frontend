import { describe, expect, it } from 'vitest'
import type { Account } from '@/api/accounts'
import { transferSourceAccounts } from './transferAccounts'

const accounts = [
  { id: 'personal', accessMode: 'personal' },
  { id: 'shared', accessMode: 'shared' },
] as Account[]

describe('transferSourceAccounts', () => {
  it('allows only personal sources for external transfers', () => {
    expect(transferSourceAccounts(accounts, true).map((a) => a.id)).toEqual(['personal'])
  })
  it('preserves shared sources for transactions between accessible accounts', () => {
    expect(transferSourceAccounts(accounts, false)).toEqual(accounts)
  })
  it('offers no source when the user only has shared accounts', () => {
    expect(transferSourceAccounts(accounts.slice(1), true)).toEqual([])
  })
})
