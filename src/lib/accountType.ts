import type { AccountType } from '@/api/accounts'

export function shouldShowSharedTypeHint(
  initialType: AccountType | undefined,
  currentType: AccountType,
): boolean {
  return initialType === 'personal' && currentType === 'shared'
}
