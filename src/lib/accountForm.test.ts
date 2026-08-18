import { describe, expect, it } from 'vitest'

import {
  hasAccountFormChanges,
  initialBalanceInputValue,
  type AccountFormState,
} from './accountForm'

const initialState: AccountFormState = {
  name: 'Карта',
  type: 'personal',
  currency: 'RUB',
  icon: 'preset:debit-card',
  includeInBalance: true,
  initialBalance: '0',
  initialBalanceDate: '2026-08-18',
}

describe('initialBalanceInputValue', () => {
  it('keeps an explicit zero visible and defaults new accounts to zero', () => {
    expect(initialBalanceInputValue(0)).toBe('0')
    expect(initialBalanceInputValue(undefined)).toBe('0')
    expect(initialBalanceInputValue(125.5)).toBe('125.5')
  })
})

describe('hasAccountFormChanges', () => {
  it('detects only real changes to the form state', () => {
    expect(hasAccountFormChanges(initialState, { ...initialState })).toBe(false)
    expect(hasAccountFormChanges(initialState, { ...initialState, type: 'shared' })).toBe(true)
    expect(hasAccountFormChanges(initialState, { ...initialState, initialBalance: '100' })).toBe(true)
  })
})
