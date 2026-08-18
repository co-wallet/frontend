import { describe, expect, it } from 'vitest'

import { shouldShowPersonalTypeWarning } from './accountType'

describe('shouldShowPersonalTypeWarning', () => {
  it('shows the warning only when a shared account becomes personal', () => {
    expect(shouldShowPersonalTypeWarning('shared', 'personal')).toBe(true)
    expect(shouldShowPersonalTypeWarning('shared', 'shared')).toBe(false)
    expect(shouldShowPersonalTypeWarning('personal', 'shared')).toBe(false)
    expect(shouldShowPersonalTypeWarning('personal', 'personal')).toBe(false)
  })
})
