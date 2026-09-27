import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { transactionsApi, type Transaction, type TransactionFilter } from '@/api/transactions'
import { transactionPaginationOptions } from './transactionPagination'

vi.mock('@/api/transactions', () => ({ transactionsApi: { list: vi.fn() } }))

const page = (start: number, count = 50): Transaction[] => Array.from({ length: count }, (_, i) => ({
  id: String(start + i), date: '2026-08-21', amount: 10, type: 'expense',
} as Transaction))

let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => client.clear())

function observe(filter: TransactionFilter = {}) {
  return new InfiniteQueryObserver(client, transactionPaginationOptions(filter))
}

describe('transaction pagination', () => {
  it('can stay disabled while the effective account set is unavailable', () => {
    expect(transactionPaginationOptions({}, false).enabled).toBe(false)
  })

  it('loads pages on demand and stops after a partial page', async () => {
    const first = page(0)
    const second = page(50, 3)
    vi.mocked(transactionsApi.list).mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const observer = observe({ dateFrom: '2026-01-01', dateTo: '2026-12-31', tagIds: ['travel'], tagMode: 'and' })
    const initial = await observer.refetch()
    expect(initial.data?.pages).toEqual([first])
    expect(observer.getCurrentResult().hasNextPage).toBe(true)
    expect(transactionsApi.list).toHaveBeenCalledTimes(1)
    const result = await observer.fetchNextPage()
    expect(result.data?.pages.flat()).toEqual([...first, ...second])
    expect(result.hasNextPage).toBe(false)
    expect(transactionsApi.list).toHaveBeenLastCalledWith({ dateFrom: '2026-01-01', dateTo: '2026-12-31', tagIds: ['travel'], tagMode: 'and', page: 2, limit: 50 })
    await observer.fetchNextPage()
    expect(transactionsApi.list).toHaveBeenCalledTimes(2)
  })

  it('stops at an empty page after an exact multiple of the page size', async () => {
    vi.mocked(transactionsApi.list).mockResolvedValueOnce(page(0)).mockResolvedValueOnce([])
    const observer = observe()
    await observer.refetch()
    const result = await observer.fetchNextPage()
    expect(result.hasNextPage).toBe(false)
    expect(result.data?.pages.flat()).toHaveLength(50)
  })

  it('handles an empty period without requesting another page', async () => {
    vi.mocked(transactionsApi.list).mockResolvedValue([])
    const observer = observe()
    const result = await observer.refetch()
    expect(result.data?.pages).toEqual([[]])
    expect(observer.getCurrentResult().hasNextPage).toBe(false)
  })

  it('preserves loaded rows on error and retries the failed page', async () => {
    const first = page(0)
    vi.mocked(transactionsApi.list).mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(50, 1))
    const observer = observe()
    await observer.refetch()
    const failed = await observer.fetchNextPage()
    expect(failed.isFetchNextPageError).toBe(true)
    expect(failed.data?.pages).toEqual([first])
    const retried = await observer.fetchNextPage()
    expect(retried.isError).toBe(false)
    expect(retried.data?.pages.flat()).toHaveLength(51)
    expect(vi.mocked(transactionsApi.list).mock.calls.map(([filter]) => filter?.page)).toEqual([1, 2, 2])
  })

  it.each([
    { dateFrom: '2025-01-01', dateTo: '2025-12-31' },
    { accountIds: ['account'] },
    { categoryIds: ['category'] },
    { tagIds: ['tag'], tagMode: 'and' as const },
  ])('starts a new list for changed filters %j', async (filter) => {
    vi.mocked(transactionsApi.list).mockResolvedValueOnce(page(0)).mockResolvedValueOnce(page(50)).mockResolvedValueOnce(page(100, 1))
    const observer = observe()
    await observer.refetch()
    await observer.fetchNextPage()
    observer.setOptions(transactionPaginationOptions(filter))
    const result = await observer.refetch()
    expect(result.data?.pageParams).toEqual([1])
    expect(result.data?.pages.flat().map(tx => tx.id)).toEqual(['100'])
    expect(transactionsApi.list).toHaveBeenLastCalledWith({ ...filter, page: 1, limit: 50 })
  })

  it('refreshes all loaded pages when transactions are invalidated', async () => {
    vi.mocked(transactionsApi.list).mockResolvedValueOnce(page(0)).mockResolvedValueOnce(page(50, 1)).mockResolvedValueOnce(page(1)).mockResolvedValueOnce([])
    const observer = observe()
    const unsubscribe = observer.subscribe(() => {})
    await observer.refetch()
    await observer.fetchNextPage()
    await client.invalidateQueries({ queryKey: ['transactions'] })
    expect(observer.getCurrentResult().data?.pages.flat().map(tx => tx.id)).toEqual(page(1).map(tx => tx.id))
    expect(vi.mocked(transactionsApi.list).mock.calls.map(([filter]) => filter?.page)).toEqual([1, 2, 1, 2])
    unsubscribe()
  })
})
