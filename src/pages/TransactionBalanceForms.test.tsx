import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AddTransactionPage } from './AddTransactionPage'
import { EditTransactionPage } from './EditTransactionPage'

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: vi.fn(), goBack: vi.fn() }),
  useLocation: () => ({ search: '' }),
  useParams: () => ({ txID: 'tx-1' }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'transactions'
      ? { id: 'tx-1', accountId: 'a-1', type: 'expense', amount: 100, currency: 'USD', date: '2026-09-09', shares: [] }
      : [],
    isLoading: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe.each([AddTransactionPage, EditTransactionPage])('%s', (Page) => {
  it('keeps transaction fields and saving available without a balance exclusion control', () => {
    const markup = renderToStaticMarkup(<Page />)
    expect(markup).toContain('Сумма')
    expect(markup).toContain('Дата')
    expect(markup).toContain('Сохранить')
    expect(markup).not.toContain('Учитывать в балансе')
    expect(markup).not.toContain('ion-toggle')
  })
})
