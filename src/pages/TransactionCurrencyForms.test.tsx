import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddTransactionPage } from './AddTransactionPage'
import { EditTransactionPage } from './EditTransactionPage'

const state = vi.hoisted(() => ({
  type: 'expense', source: 'RUB', destination: 'EUR', base: 'RUB',
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (select: (store: unknown) => unknown) => select({ user: { defaultCurrency: state.base } }),
}))
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: vi.fn(), goBack: vi.fn(), replace: vi.fn() }),
  useLocation: () => ({ search: `?type=${state.type}&account_id=source&currency=EUR` }),
  useParams: () => ({ txID: 'transaction' }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'accounts' ? [
      { id: 'source', name: 'Исходный', currency: state.source, accessMode: 'personal' },
      { id: 'destination', name: 'Целевой', currency: state.destination, accessMode: 'personal' },
    ] : queryKey[0] === 'currencies' ? [
      { code: 'RUB', rateToUsd: 80 }, { code: 'EUR', rateToUsd: 0.8 }, { code: 'USD', rateToUsd: 1 },
    ] : queryKey[0] === 'transactions' ? {
      id: 'transaction', accountId: 'source', toAccountId: 'destination', toCurrency: state.destination,
      type: state.type, currency: state.source, amount: 100, toAmount: 90,
      defaultCurrency: 'EUR', defaultCurrencyAmount: 80, date: '2026-10-12', shares: [], tags: [],
    } : [],
    isLoading: false, isFetching: false, isError: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

beforeEach(() => { state.type = 'expense'; state.source = 'RUB'; state.destination = 'EUR'; state.base = 'RUB' })

describe.each([AddTransactionPage, EditTransactionPage])('%s currency fields', (Page) => {
  it.each(['expense', 'income'])('does not add a display-currency field to a native %s', (type) => {
    state.type = type
    const markup = renderToStaticMarkup(<Page />)
    expect(markup).toContain('label="Сумма (RUB)"')
    expect(markup).not.toContain('label="Сумма в ')
  })

  it.each(['expense', 'income'])('uses only the profile base currency for a foreign %s', (type) => {
    state.type = type
    state.source = 'USD'
    const markup = renderToStaticMarkup(<Page />)
    expect(markup).toContain('label="Сумма (USD)"')
    expect(markup).toContain('label="Сумма в RUB"')
    expect(markup).not.toContain('label="Сумма в EUR"')
  })

  it.each([
    { source: 'RUB', destination: 'EUR' },
    { source: 'EUR', destination: 'RUB' },
    { source: 'USD', destination: 'EUR' },
    { source: 'USD', destination: 'USD' },
    { source: 'RUB', destination: 'RUB' },
  ])('never shows an additional base amount for $source → $destination', ({ source, destination }) => {
    state.type = 'transfer'
    state.source = source
    state.destination = destination
    const markup = renderToStaticMarkup(<Page />)
    expect(markup).toContain(`label="Сумма (${source})"`)
    expect(markup).not.toContain('label="Сумма в ')
    if (source !== 'RUB') expect(markup).not.toContain('1 RUB =')
  })
})
