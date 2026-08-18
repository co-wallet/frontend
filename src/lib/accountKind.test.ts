import { describe, expect, it } from 'vitest'

import { ACCOUNT_KIND_OPTIONS, accountKindLabel } from './accountKind'

describe('account kinds', () => {
  it('exposes the supported kinds with user-facing labels', () => {
    expect(ACCOUNT_KIND_OPTIONS.map((option) => option.value)).toEqual([
      'spending',
      'deposit',
      'investment',
    ])
    expect(accountKindLabel('spending')).toBe('Для текущих расходов')
    expect(accountKindLabel('deposit')).toBe('Вклад')
    expect(accountKindLabel('investment')).toBe('Инвестиции')
  })
})
