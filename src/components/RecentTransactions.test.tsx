import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { transactionsApi, type Transaction } from '@/api/transactions'
import { RecentTransactions } from './RecentTransactions'

vi.mock('@/lib/useRecentTransactionsFit', () => ({
  useRecentTransactionsFit: () => ({ ref: { current: null }, count: 2, compact: false, hidden: false }),
}))

const state = vi.hoisted(() => ({
  loading: false,
  error: false,
  categoryError: false,
  items: [] as Transaction[],
  queries: [] as { queryKey: unknown[]; enabled: boolean; queryFn: () => Promise<unknown> }[],
}))
vi.mock('@/api/transactions', () => ({ transactionsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (query: typeof state.queries[number]) => {
    state.queries.push(query)
    return query.queryKey[0] === 'transactions'
      ? { data: state.items, isLoading: state.loading, isError: state.error, refetch: vi.fn() }
      : { data: [], isLoading: false, isError: state.categoryError, refetch: vi.fn() }
  },
}))

function render(overrides = {}) {
  return renderToStaticMarkup(<MemoryRouter><RecentTransactions accounts={[]} accountIds={['selected']}
    accountsLoading={false} defaultCurrency="RUB" {...overrides} /></MemoryRouter>)
}

afterEach(() => {
  state.loading = false
  state.error = false
  state.categoryError = false
  state.items = []
  state.queries = []
  vi.clearAllMocks()
})

describe('RecentTransactions', () => {
  it('requests a bounded batch of transactions for the selected accounts', async () => {
    render()
    const query = state.queries.find((query) => query.queryKey[0] === 'transactions')!
    expect(query.enabled).toBe(true)
    await query.queryFn()
    expect(transactionsApi.list).toHaveBeenCalledWith({ accountIds: ['selected'], page: 1, limit: 20 })
  })

  it('applies additional filters to the preview and uses the filtered list link', async () => {
    const markup = render({
      filter: { dateFrom: '2026-09-01', dateTo: '2026-09-10' },
      fullListHref: '/transactions/filtered/1?period=month&account_kinds=spending',
    })
    const query = state.queries.find((query) => query.queryKey[0] === 'transactions')!
    await query.queryFn()
    expect(transactionsApi.list).toHaveBeenCalledWith({
      accountIds: ['selected'],
      dateFrom: '2026-09-01',
      dateTo: '2026-09-10',
      page: 1,
      limit: 20,
    })
    expect(markup).toContain('href="/transactions/filtered/1?period=month&amp;account_kinds=spending"')
  })

  it.each([
    { accountsLoading: true },
    { accountsError: true },
    { accountIds: [] },
  ])('never requests all transactions while accounts are unavailable: %j', (props) => {
    render(props)
    expect(state.queries.every((query) => !query.enabled)).toBe(true)
  })

  it('shows an empty state and access to the full list', () => {
    const markup = render()
    expect(markup).toContain('По выбранным счетам пока нет транзакций')
    expect(markup).toContain('href="/transactions"')
    expect(markup).toContain('Все транзакции')
  })

  it('shows loading instead of an empty state', () => {
    state.loading = true
    const markup = render()
    expect(markup).toContain('Загрузка последних транзакций')
    expect(markup).not.toContain('пока нет транзакций')
  })

  it.each(['error', 'categoryError'] as const)('offers a retry on %s', (field) => {
    state[field] = true
    const markup = render()
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('Повторить')
    expect(markup).not.toContain('пока нет транзакций')
  })

  it('groups dates above rows and hides tags, only displaying the number of rows that fit', () => {
    state.items = [1, 2, 3, 4].map((id) => ({
      id: String(id), accountId: 'selected', accountName: 'Личная', type: 'expense', amount: id,
      currency: 'RUB', description: `Операция ${id}`, date: '2026-09-02T00:00:00Z',
      tags: [{ id: 'tag', name: 'Скрытый тег' }], shares: [],
    } as unknown as Transaction))
    const markup = render()
    expect(markup).toMatch(/Операция 1[^]*Операция 2[^]*Операция 3/)
    expect(markup.match(/recent-transactions__row--hidden/g)).toHaveLength(2)
    expect(markup).toMatch(/recent-transactions__row--hidden[^]*Операция 3/)
    expect(markup.match(/2 сентября/g)).toHaveLength(1)
    expect(markup).toMatch(/<h3[^>]*>[^<]*2 сентября<\/h3>[^]*Операция 1/)
    expect(markup).not.toContain('Скрытый тег')
    expect(markup).toContain('Личная')
    expect(markup).not.toContain('Удалить')
  })
})
