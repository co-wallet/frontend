import { describe, expect, it } from 'vitest'

import { shouldShowSharedTypeHint } from './accountType'

describe('shouldShowSharedTypeHint', () => {
  it('shows the hint only when a personal account becomes shared', () => {
    expect(shouldShowSharedTypeHint('personal', 'shared')).toBe(true)
    expect(shouldShowSharedTypeHint('personal', 'personal')).toBe(false)
    expect(shouldShowSharedTypeHint('shared', 'personal')).toBe(false)
    expect(shouldShowSharedTypeHint('shared', 'shared')).toBe(false)
  })
})
