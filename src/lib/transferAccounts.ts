import type { Account, TransferAccount } from '@/api/accounts'

export function transferSourceAccounts(accounts: Account[], external: TransferAccount[]): TransferAccount[] {
  return [...accounts, ...external.filter((a) => !accounts.some((own) => own.id === a.id))]
}

export function transferDestinationAccounts(accounts: Account[], external: TransferAccount[], sourceId: string): TransferAccount[] {
  const source = accounts.find((a) => a.id === sourceId)
  const options = source?.accessMode === 'personal' ? transferSourceAccounts(accounts, external) : accounts
  return options.filter((a) => a.id !== sourceId)
}
