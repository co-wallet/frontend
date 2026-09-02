import { describe, expect, it } from 'vitest'

import type { Account } from '@/api/accounts'
import type { Transaction } from '@/api/transactions'
import {
  buildTransactionAnalyticsParams,
  formatCurrencyAmount,
  formatPeriodControlLabel,
  formatTransactionAmount,
  formatTransactionDate,
  groupTransactionsByDate,
  hasTransactionFilters,
  isSharedTransaction,
  transactionDefaultCurrencyAmount,
  transactionUserAmount,
} from '@/lib/transactionList'

const personalAccount: Account = {
  id: 'account-1',
  ownerId: 'user-1',
  name: 'Личная',
  accessMode: 'personal',
  kind: 'spending',
  currency: 'RUB',
  icon: null,
  initialBalance: 0,
  initialBalanceDate: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const sharedAccount: Account = {
  ...personalAccount,
  id: 'account-2',
  name: 'Семейная',
  accessMode: 'shared',
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    accountId: personalAccount.id,
    toAccountId: null,
    toAmount: null,
    type: 'expense',
    amount: 1000,
    currency: 'RUB',
    exchangeRate: null,
    defaultCurrency: 'RUB',
    defaultCurrencyAmount: 1000,
    categoryId: null,
    description: null,
    date: '2026-09-02T00:00:00Z',
    includeInBalance: true,
    createdBy: 'user-1',
    createdAt: '2026-09-02T00:00:00Z',
    shares: [],
    tags: [],
    ...overrides,
  }
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s/g, ' ')
}

describe('transaction list helpers', () => {
  it('formats currency with a compact symbol and keeps meaningful decimals', () => {
    expect(normalizeSpaces(formatCurrencyAmount(1000, 'RUB'))).toBe('1 000 ₽')
    expect(normalizeSpaces(formatCurrencyAmount(100.5, 'RUB'))).toBe('100,50 ₽')
    expect(normalizeSpaces(formatCurrencyAmount(-0, 'RUB'))).toBe('0 ₽')
    expect(normalizeSpaces(formatTransactionAmount(1000, 'RUB', 'expense'))).toBe('−1 000 ₽')
    expect(normalizeSpaces(formatTransactionAmount(1000, 'RUB', 'income'))).toBe('+1 000 ₽')
  })

  it('uses the current user share for a shared transaction', () => {
    const tx = transaction({
      accountId: sharedAccount.id,
      shares: [
        { userId: 'user-1', amount: 400, isCustom: false },
        { userId: 'user-2', amount: 600, isCustom: false },
      ],
    })

    expect(transactionUserAmount(tx, sharedAccount, 'user-1')).toBe(400)
    expect(isSharedTransaction(tx, sharedAccount, 'user-1')).toBe(true)
  })

  it('converts the user share proportionally to the default currency', () => {
    const tx = transaction({
      accountId: sharedAccount.id,
      amount: 100,
      currency: 'USD',
      defaultCurrency: 'RUB',
      defaultCurrencyAmount: 8000,
      shares: [{ userId: 'user-1', amount: 25, isCustom: true }],
    })

    expect(transactionDefaultCurrencyAmount(tx, sharedAccount, 'user-1', 'RUB')).toBe(2000)
  })

  it('uses relative labels for today and yesterday and a weekday otherwise', () => {
    const now = new Date(2026, 8, 2, 12)

    expect(formatTransactionDate('2026-09-02', now)).toBe('Сегодня, 2 сентября')
    expect(formatTransactionDate('2026-09-01', now)).toBe('Вчера, 1 сентября')
    expect(formatTransactionDate('2026-08-18', now)).toBe('Вторник, 18 августа')
  })

  it('formats period controls compactly without hiding the selected range', () => {
    expect(formatPeriodControlLabel('week', '2026-08-31', '2026-09-06')).toBe('31.08–06.09.2026')
    expect(formatPeriodControlLabel('quarter', '2026-07-01', '2026-09-30')).toBe('3 кв. 2026')
    expect(formatPeriodControlLabel('year', '2026-01-01', '2026-12-31')).toBe('2026')
  })

  it('groups newest dates first and calculates a signed daily total', () => {
    const transactions = [
      transaction({ id: 'expense', amount: 100, date: '2026-09-02T00:00:00Z' }),
      transaction({ id: 'income', type: 'income', amount: 40, date: '2026-09-02T00:00:00Z' }),
      transaction({ id: 'older', amount: 20, date: '2026-09-01T00:00:00Z' }),
    ]

    const groups = groupTransactionsByDate(transactions, (tx) => tx.amount, new Date(2026, 8, 2, 12))

    expect(groups.map((group) => group.dateKey)).toEqual(['2026-09-02', '2026-09-01'])
    expect(groups[0].total).toBe(-60)
    expect(groups[1].total).toBe(-20)
  })

  it('does not show a misleading daily total when conversion is unavailable', () => {
    const groups = groupTransactionsByDate([transaction()], () => null)

    expect(groups[0].total).toBeNull()
  })

  it('builds analytics parameters from the same filters as the transaction list', () => {
    const params = buildTransactionAnalyticsParams({
      accountIds: ['account-1'],
      categoryIds: ['category-1'],
      tagIds: ['tag-1', 'tag-2'],
      tagMode: 'and',
    }, '2026-09-01', '2026-09-02', 'RUB')

    expect(params).toEqual({
      date_from: '2026-09-01',
      date_to: '2026-09-02',
      currency: 'RUB',
      account_kinds: 'all',
      account_ids: 'account-1',
      category_ids: 'category-1',
      tag_ids: 'tag-1,tag-2',
      tag_mode: 'and',
    })
    expect(hasTransactionFilters({ tagIds: ['tag-1'] })).toBe(true)
    expect(hasTransactionFilters({})).toBe(false)
  })
})
