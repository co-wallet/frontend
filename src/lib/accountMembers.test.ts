import { describe, expect, it } from 'vitest'
import { buildAccountMembers } from './accountMembers'

describe('account creation members', () => {
  it('preserves four-decimal shares and accepts comma separators', () => {
    expect(buildAccountMembers([{ username: ' alice ', share: '0,3333' }, { username: 'bob', share: '0.6667' }], 'alice'))
      .toEqual({ members: [{ username: 'alice', defaultShare: 0.3333 }, { username: 'bob', defaultShare: 0.6667 }] })
  })
  it('allows a zero share while keeping every member explicit', () => {
    expect(buildAccountMembers([{ username: 'alice', share: '0' }, { username: 'bob', share: '1' }], 'alice').error).toBeUndefined()
  })
  it.each(['', '-0.1', '1.1', '0.99999', 'NaN', 'Infinity', '0.5oops', '0.9'])('rejects invalid or incomplete distribution %s', (share) => {
    expect(buildAccountMembers([{ username: 'alice', share }], 'alice').error).toBeTruthy()
  })
  it('rejects missing owners, empty names, and duplicates', () => {
    for (const members of [[], [{ username: 'bob', share: '1' }], [{ username: '', share: '1' }], [{ username: 'alice', share: '0.5' }, { username: ' alice ', share: '0.5' }]]) {
      expect(buildAccountMembers(members, 'alice').error).toBeTruthy()
    }
  })
})
