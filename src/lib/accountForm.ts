import type { AccountAccessMode, AccountKind } from '@/api/accounts'

export interface AccountFormState {
  name: string
  accessMode: AccountAccessMode
  kind: AccountKind
  currency: string
  icon: string
  initialBalance: string
  initialBalanceDate: string
}

export function initialBalanceInputValue(value: number | undefined): string {
  return value === undefined ? '0' : String(value)
}

export function hasAccountFormChanges(
  initial: AccountFormState,
  current: AccountFormState,
): boolean {
  return initial.name !== current.name
    || initial.accessMode !== current.accessMode
    || initial.kind !== current.kind
    || initial.currency !== current.currency
    || initial.icon !== current.icon
    || initial.initialBalance !== current.initialBalance
    || initial.initialBalanceDate !== current.initialBalanceDate
}
