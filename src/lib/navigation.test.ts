import { describe, expect, it } from 'vitest'

import { isMenuPathActive } from '@/lib/navigation'

describe('isMenuPathActive', () => {
  it('matches a top-level destination and its nested routes', () => {
    expect(isMenuPathActive('/transactions', '/transactions')).toBe(true)
    expect(isMenuPathActive('/transactions/add', '/transactions')).toBe(true)
    expect(isMenuPathActive('/transactions/tx-1/edit', '/transactions')).toBe(true)
    expect(isMenuPathActive('/accounts/account-1/members', '/accounts')).toBe(true)
  })

  it('does not match similarly prefixed or unrelated routes', () => {
    expect(isMenuPathActive('/transactions-archive', '/transactions')).toBe(false)
    expect(isMenuPathActive('/categories', '/transactions')).toBe(false)
  })

  it('keeps exact parent destinations inactive on child routes', () => {
    expect(isMenuPathActive('/admin', '/admin', true)).toBe(true)
    expect(isMenuPathActive('/admin/users', '/admin', true)).toBe(false)
  })
})
