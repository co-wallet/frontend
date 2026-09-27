import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddTransactionPage } from './AddTransactionPage'

const route = vi.hoisted(() => ({ search: '' }))

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ goBack: vi.fn(), replace: vi.fn() }),
  useLocation: () => ({ pathname: '/transactions/add', search: route.search, state: undefined }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'accounts'
      ? [{ id: 'account-1', name: 'Личная', currency: 'RUB', accessMode: 'personal' }]
      : [],
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('AddTransactionPage creation defaults', () => {
  beforeEach(() => { route.search = '' })

  it('prefills type, account and date from quick-add navigation', () => {
    route.search = '?type=income&account_id=account-1&date=2026-09-20'
    const markup = renderToStaticMarkup(<AddTransactionPage />)

    expect(markup).toContain('value="income"')
    expect(markup).toContain('Личная · RUB')
    expect(markup).toContain('type="date" value="2026-09-20"')
  })

  it('keeps the full account picker available when no account is preselected', () => {
    route.search = '?type=expense&date=2026-09-20'
    const markup = renderToStaticMarkup(<AddTransactionPage />)

    expect(markup).toContain('Выберите счёт')
    expect(markup).toContain('value="expense"')
  })
})
