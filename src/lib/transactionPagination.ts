import { infiniteQueryOptions } from '@tanstack/react-query'
import { transactionsApi, type TransactionFilter } from '@/api/transactions'

const PAGE_SIZE = 50

export function transactionPaginationOptions(filter: TransactionFilter, enabled = true) {
  return infiniteQueryOptions({
    queryKey: ['transactions', 'infinite', filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => transactionsApi.list({ ...filter, page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    enabled,
  })
}
