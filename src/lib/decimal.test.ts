import { describe, expect, it } from 'vitest'

import {
  filterDecimalInput,
  filterSignedDecimalInput,
  isValidDecimal,
  parseDecimal,
  toggleDecimalSign,
} from './decimal'

describe('decimal input helpers', () => {
  it('keeps regular transaction inputs unsigned', () => {
    expect(filterDecimalInput('-123,45678')).toBe('123,4567')
  })

  it('preserves one leading minus for signed balances', () => {
    expect(filterSignedDecimalInput('-123,45678')).toBe('-123,4567')
    expect(filterSignedDecimalInput('--12')).toBe('-12')
    expect(filterSignedDecimalInput('12-')).toBe('12')
    expect(filterSignedDecimalInput('-')).toBe('-')
  })

  it('toggles the sign and parses a completed negative value', () => {
    expect(toggleDecimalSign('125.5')).toBe('-125.5')
    expect(toggleDecimalSign('-125.5')).toBe('125.5')
    expect(toggleDecimalSign('0')).toBe('-')
    expect(toggleDecimalSign('-')).toBe('0')
    expect(isValidDecimal('-')).toBe(false)
    expect(isValidDecimal('-125,5')).toBe(true)
    expect(parseDecimal('-125,5')).toBe(-125.5)
  })
})
