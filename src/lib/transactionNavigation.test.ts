import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'history'
import type { TransactionFilter } from '@/api/transactions'
import { computeDateRange } from '@/store/periodStore'
import {
  accountTransactionsHref,
  categoryTransactionsHref,
  filterFromParams,
  filterToParams,
  filteredTransactionsHref,
  finishTransactionCreation,
  periodFromParams,
  periodToParams,
  transactionCreationDefaults,
  transactionCreationLocation,
  transactionCreationReturnTo,
  type TransactionPeriod,
} from './transactionNavigation'

const period: TransactionPeriod = { period: 'month', periodOffset: -2, customFrom: '2026-03-01', customTo: '2026-03-15' }
const query = (href: string) => new URL(href, 'http://localhost').searchParams

describe('tag navigation', () => {
  it.each(['day', 'week', 'month', 'quarter', 'year', 'custom'] as const)('preserves the %s period and offset', (value) => {
    const source = { ...period, period: value }
    const href = filteredTransactionsHref({ tagIds: ['travel'] }, source)
    const actual = periodFromParams(query(href), { ...period, periodOffset: 0 })
    expect(actual).toEqual(source)
    expect(computeDateRange(actual.period, actual.periodOffset, actual.customFrom, actual.customTo))
      .toEqual(computeDateRange(source.period, source.periodOffset, source.customFrom, source.customTo))
  })

  it('preserves account and category filters with the selected tag', () => {
    const filter = { accountIds: ['one', 'two'], categoryIds: ['food'], tagIds: ['travel'] }
    expect(filterFromParams(query(filteredTransactionsHref(filter, period)))).toEqual(filter)
  })

  it('round-trips account scope and independent transfer preferences', () => {
    const filter: TransactionFilter = {
      accountKinds: ['spending', 'investment'] as const,
      includeShared: true,
      includeTransferExpenses: true,
      includeTransferIncome: false,
    }
    expect(filterFromParams(filterToParams(filter))).toEqual(filter)
    expect(filterFromParams(filterToParams({ accountKinds: [] }))).toEqual({ accountKinds: [] })
  })

  it('round-trips shared-only scope and keeps legacy include-shared links as all accounts', () => {
    const sharedOnly: TransactionFilter = { includeShared: true, onlyShared: true }
    expect(filterFromParams(filterToParams(sharedOnly))).toEqual(sharedOnly)
    expect(filterFromParams(new URLSearchParams('include_shared=true'))).toEqual({ includeShared: true })
    expect(filterFromParams(new URLSearchParams('only_shared=true'))).toEqual(sharedOnly)
  })

  it('encodes tag ids and preserves AND mode when serializing an existing filter', () => {
    const filter = { tagIds: ['tag & one', 'two'], tagMode: 'and' as const }
    expect(filterFromParams(filterToParams(filter))).toEqual(filter)
  })

  it('round-trips the without-tags filter', () => {
    expect(filterFromParams(filterToParams({ withoutTags: true }))).toEqual({ withoutTags: true })
  })

  it('round-trips supported transaction types and ignores unknown values', () => {
    expect(filterFromParams(filterToParams({ types: ['expense', 'transfer'] }))).toEqual({
      types: ['expense', 'transfer'],
    })
    expect(filterFromParams(new URLSearchParams('types=unknown,income,income'))).toEqual({
      types: ['income'],
    })
  })

  it('round-trips account scope and independent transfer preferences', () => {
    const filter: TransactionFilter = {
      accountKinds: ['spending', 'investment'],
      includeShared: true,
      includeTransferExpenses: true,
      includeTransferIncome: false,
    }
    expect(filterFromParams(filterToParams(filter))).toEqual(filter)
    expect(filterFromParams(filterToParams({ accountKinds: [] }))).toEqual({ accountKinds: [] })
  })

  it('ignores unsupported account kinds', () => {
    expect(filterFromParams(new URLSearchParams('account_kinds=crypto,spending'))).toEqual({
      accountKinds: ['spending'],
    })
  })

  it('clears filters without losing the period', () => {
    const params = query(filteredTransactionsHref({ accountIds: ['one'], tagIds: ['travel'], tagMode: 'and' }, period))
    const cleared = filterToParams({}, params)
    expect(filterFromParams(cleared)).toEqual({})
    expect(periodFromParams(cleared, period)).toEqual(period)
    expect(filterFromParams(params).tagIds).toEqual(['travel'])
  })

  it('keeps the parent URL and period when changing a child and going back', () => {
    const parent = filteredTransactionsHref({ tagIds: ['travel'] }, period)
    const history = createMemoryHistory({ initialEntries: ['/dashboard', parent], initialIndex: 1 })
    const child = filteredTransactionsHref({ tagIds: ['japan'] }, period, history.location.pathname)
    expect(child).toContain('/filtered/2?')
    history.push(child)
    history.replace({ ...history.location, search: periodToParams({ ...period, periodOffset: -3 }, query(child)).toString() })
    history.goBack()
    expect(history.location.pathname + history.location.search).toBe(parent)
    history.goBack()
    expect(history.location.pathname).toBe('/dashboard')
  })

  it('falls back for unknown periods and ignores invalid offsets', () => {
    expect(periodFromParams(new URLSearchParams('period=invalid'), period)).toEqual(period)
    expect(periodFromParams(new URLSearchParams('period=toString'), period)).toEqual(period)
    for (const offset of ['NaN', '1', '-1.5', '-1000000000']) {
      expect(periodFromParams(new URLSearchParams(`period=month&offset=${offset}`), period).periodOffset).toBe(0)
    }
  })
})

describe('account navigation', () => {
  it('selects a personal account with its kind and preserves the period', () => {
    const href = accountTransactionsHref({
      id: 'deposit & one',
      kind: 'deposit',
      accessMode: 'personal',
    }, period)

    expect(filterFromParams(query(href))).toEqual({
      accountIds: ['deposit & one'],
      accountKinds: ['deposit'],
    })
    expect(periodFromParams(query(href), { ...period, periodOffset: 0 })).toEqual(period)
  })

  it('includes shared accounts and advances filtered navigation depth', () => {
    const href = accountTransactionsHref({
      id: 'shared-account',
      kind: 'savings_account',
      accessMode: 'shared',
    }, period, '/transactions/filtered/2')

    expect(href).toContain('/transactions/filtered/3?')
    expect(filterFromParams(query(href))).toEqual({
      accountIds: ['shared-account'],
      accountKinds: ['savings_account'],
      includeShared: true,
    })
  })
})

describe('category navigation', () => {
  it('adds the category while preserving account scope and period', () => {
    const href = categoryTransactionsHref('travel', {
      accountIds: ['account-1'],
      accountKinds: ['spending'],
      includeShared: true,
    }, period)

    expect(href).toBeDefined()
    expect(filterFromParams(query(href!))).toEqual({
      accountIds: ['account-1'],
      accountKinds: ['spending'],
      includeShared: true,
      categoryIds: ['travel'],
    })
    expect(periodFromParams(query(href!), { ...period, periodOffset: 0 })).toEqual(period)
  })

  it.each(['uncategorized', 'transfers', 'transfers:bank'])(
    'does not create an invalid transaction filter for %s analytics',
    (categoryId) => {
      expect(categoryTransactionsHref(categoryId, {}, period)).toBeUndefined()
    },
  )
})

describe('transaction creation navigation', () => {
  it('returns to the exact filtered source and removes the form from the back chain', () => {
    const source = '/transactions/filtered/2?period=custom&from=2026-09-01&to=2026-09-20&tag_ids=travel'
    const history = createMemoryHistory({ initialEntries: ['/dashboard', source], initialIndex: 1 })
    history.push(transactionCreationLocation(history.location, { date: '2026-09-20' }))

    expect(transactionCreationReturnTo(history.location.state)).toBe(source)
    finishTransactionCreation(history, history.location.state)
    expect(history.location.pathname + history.location.search).toBe(source)

    history.goBack()
    expect(history.location.pathname).toBe('/dashboard')
  })

  it('replaces a directly opened form with the transaction list', () => {
    const history = createMemoryHistory({ initialEntries: ['/transactions/add'] })

    finishTransactionCreation(history, history.location.state)
    expect(history.location.pathname).toBe('/transactions')
    expect(history.action).toBe('REPLACE')
  })

  it('round-trips safe type, account and date defaults without constraining the form', () => {
    const location = transactionCreationLocation(
      { pathname: '/transactions', search: '?account_ids=account-1' },
      { type: 'income', accountId: 'account & 1', date: '2026-09-20' },
    )

    expect(location.pathname).toBe('/transactions/add')
    expect(transactionCreationDefaults(new URLSearchParams(location.search))).toEqual({
      type: 'income',
      accountId: 'account & 1',
      date: '2026-09-20',
    })
    expect(location.state).toEqual({ transactionReturnTo: '/transactions?account_ids=account-1' })
  })

  it('ignores malformed creation defaults', () => {
    expect(transactionCreationDefaults(new URLSearchParams(
      'type=refund&account_id=%20%20&date=2026-02-30',
    ))).toEqual({})
  })

  it('rejects external and malformed return locations', () => {
    expect(transactionCreationReturnTo({ transactionReturnTo: '//example.com' })).toBeNull()
    expect(transactionCreationReturnTo({ transactionReturnTo: 'https://example.com' })).toBeNull()
    expect(transactionCreationReturnTo(null)).toBeNull()
  })

  it('replaces repeated filter changes in one history entry', () => {
    const history = createMemoryHistory({ initialEntries: ['/dashboard', '/transactions'], initialIndex: 1 })
    history.replace({ ...history.location, search: filterToParams({ tagIds: ['travel'] }).toString() })
    history.replace({ ...history.location, search: filterToParams({ tagIds: ['japan'] }).toString() })

    expect(filterFromParams(new URLSearchParams(history.location.search))).toEqual({ tagIds: ['japan'] })
    history.goBack()
    expect(history.location.pathname).toBe('/dashboard')
  })
})

it.each([
  'from=bad&to=2026-03-01',
  'from=2026-02-30&to=2026-03-01',
  'from=2026-03-10&to=2026-03-01',
])('rejects malformed custom dates: %s', (dates) => {
  expect(periodFromParams(new URLSearchParams(`period=custom&${dates}`), period)).toEqual(period)
})
