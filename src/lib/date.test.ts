import { describe, expect, it } from 'vitest'
import { localDateISO } from './date'

describe('localDateISO', () => {
  it('formats the local calendar components', () => {
    expect(localDateISO(new Date(2026, 8, 28, 0, 30))).toBe('2026-09-28')
  })
})
