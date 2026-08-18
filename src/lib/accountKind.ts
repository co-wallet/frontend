import type { AccountKind } from '@/api/accounts'

export interface AccountKindOption {
  value: AccountKind
  label: string
  description: string
}

export const ACCOUNT_KIND_OPTIONS: readonly AccountKindOption[] = [
  {
    value: 'current',
    label: 'Текущие средства',
    description: 'Карты, наличные и счета для повседневных расходов',
  },
  {
    value: 'deposit',
    label: 'Вклад',
    description: 'Средства на банковском вкладе',
  },
  {
    value: 'investment',
    label: 'Инвестиции',
    description: 'Брокерские счета и другие инвестиционные активы',
  },
] as const

export function accountKindLabel(kind: AccountKind): string {
  return ACCOUNT_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind
}
