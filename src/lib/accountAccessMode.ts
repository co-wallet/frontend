import type { AccountAccessMode } from '@/api/accounts'

export function shouldShowPersonalAccessModeWarning(
  initialMode: AccountAccessMode | undefined,
  currentMode: AccountAccessMode,
): boolean {
  return initialMode === 'shared' && currentMode === 'personal'
}
