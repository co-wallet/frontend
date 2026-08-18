import type { AccountType } from '@/api/accounts'

export function shouldShowPersonalTypeWarning(
  initialType: AccountType | undefined,
  currentType: AccountType,
): boolean {
  return initialType === 'shared' && currentType === 'personal'
}
