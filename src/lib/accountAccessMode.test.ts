import { describe, expect, it } from 'vitest'

import { shouldShowPersonalAccessModeWarning } from './accountAccessMode'

describe('shouldShowPersonalAccessModeWarning', () => {
  it('shows the warning only when a shared account becomes personal', () => {
    expect(shouldShowPersonalAccessModeWarning('shared', 'personal')).toBe(true)
    expect(shouldShowPersonalAccessModeWarning('shared', 'shared')).toBe(false)
    expect(shouldShowPersonalAccessModeWarning('personal', 'shared')).toBe(false)
    expect(shouldShowPersonalAccessModeWarning('personal', 'personal')).toBe(false)
  })
})
