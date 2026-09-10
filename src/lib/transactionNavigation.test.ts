import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'history'
import type { TransactionFilter } from '@/api/transactions'
import { computeDateRange } from '@/store/periodStore'
import { filterFromParams, filterToParams, filteredTransactionsHref, periodFromParams, periodToParams, type TransactionPeriod } from './transactionNavigation'

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

  it('encodes tag ids and preserves AND mode when serializing an existing filter', () => {
    const filter = { tagIds: ['tag & one', 'two'], tagMode: 'and' as const }
    expect(filterFromParams(filterToParams(filter))).toEqual(filter)
  })

  it('round-trips the without-tags filter', () => {
    expect(filterFromParams(filterToParams({ withoutTags: true }))).toEqual({ withoutTags: true })
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

it.each([
  'from=bad&to=2026-03-01',
  'from=2026-02-30&to=2026-03-01',
  'from=2026-03-10&to=2026-03-01',
])('rejects malformed custom dates: %s', (dates) => {
  expect(periodFromParams(new URLSearchParams(`period=custom&${dates}`), period)).toEqual(period)
})
