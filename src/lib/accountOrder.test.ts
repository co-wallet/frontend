import { describe, expect, it } from 'vitest'
import { applyAccountOrder, moveAccount } from './accountOrder'

describe('account ordering', () => {
  it('moves in both directions without changing the original list', () => {
    const accounts = ['a', 'b', 'c', 'd']
    expect(moveAccount(accounts, 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveAccount(accounts, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    expect(accounts).toEqual(['a', 'b', 'c', 'd'])
  })

  it.each([[0, 0], [-1, 0], [0, -1], [4, 0], [0, 4]])('ignores unchanged or out of bounds movement %s to %s', (from, to) => {
    expect(moveAccount(['a', 'b', 'c', 'd'], from, to)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('orders every cache variant while keeping balances and appending new accounts', () => {
    const accounts = [{ id: 'a', balance: 15 }, { id: 'new', balance: 0 }, { id: 'b', balance: 20 }]
    expect(applyAccountOrder(accounts, ['b', 'deleted', 'a'])).toEqual([accounts[2], accounts[0], accounts[1]])
    expect(accounts.map((a) => a.id)).toEqual(['a', 'new', 'b'])
  })
})
