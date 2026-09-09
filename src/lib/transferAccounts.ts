import type { Account } from '@/api/accounts'

export function transferSourceAccounts(accounts: Account[], external: boolean): Account[] {
  return external ? accounts.filter((account) => account.accessMode === 'personal') : accounts
}
