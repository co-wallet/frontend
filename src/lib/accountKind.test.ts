import { describe, expect, it } from 'vitest'

import { ACCOUNT_KIND_OPTIONS, accountKindLabel, isAccountKind } from './accountKind'

describe('account kinds', () => {
  it('exposes the supported kinds with user-facing labels', () => {
    expect(ACCOUNT_KIND_OPTIONS.map((option) => option.value)).toEqual([
      'spending',
      'savings',
      'deposit',
      'savings_account',
      'investment',
    ])
    expect(accountKindLabel('spending')).toBe('Для текущих расходов')
    expect(accountKindLabel('savings')).toBe('Сбережения')
    expect(accountKindLabel('savings_account')).toBe('Накопительный счёт')
    expect(accountKindLabel('deposit')).toBe('Вклад')
    expect(accountKindLabel('investment')).toBe('Инвестиции')
  })
})


it.each(['spending', 'savings', 'deposit', 'savings_account', 'investment'])('accepts %s', (kind) => {
  expect(isAccountKind(kind)).toBe(true)
})

it.each(['unknown', '', 'Savings', null, undefined])('rejects unsupported kind %s', (kind) => {
  expect(isAccountKind(kind)).toBe(false)
})
