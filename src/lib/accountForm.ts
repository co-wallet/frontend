import type { AccountType } from '@/api/accounts'

export interface AccountFormState {
  name: string
  type: AccountType
  currency: string
  icon: string
  includeInBalance: boolean
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
    || initial.type !== current.type
    || initial.currency !== current.currency
    || initial.icon !== current.icon
    || initial.includeInBalance !== current.includeInBalance
    || initial.initialBalance !== current.initialBalance
    || initial.initialBalanceDate !== current.initialBalanceDate
}
