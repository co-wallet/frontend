import type { AccountKind } from '@/api/accounts'

export interface AccountKindOption {
  value: AccountKind
  label: string
  shortLabel: string
  description: string
}

export const ACCOUNT_KIND_OPTIONS: readonly AccountKindOption[] = [
  {
    value: 'spending',
    label: 'Для текущих расходов',
    shortLabel: 'Текущие средства',
    description: 'Карты, наличные и счета для повседневных расходов',
  },
  {
    value: 'deposit',
    label: 'Вклад',
    shortLabel: 'Вклад',
    description: 'Средства на банковском вкладе',
  },
  {
    value: 'investment',
    label: 'Инвестиции',
    shortLabel: 'Инвестиции',
    description: 'Брокерские счета и другие инвестиционные активы',
  },
] as const

export function accountKindLabel(kind: AccountKind): string {
  return ACCOUNT_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind
}

export function accountKindShortLabel(kind: AccountKind): string {
  return ACCOUNT_KIND_OPTIONS.find((option) => option.value === kind)?.shortLabel ?? kind
}
