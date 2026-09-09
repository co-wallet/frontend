import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@/api/accounts'
import { AccountsPage } from './AccountsPage'

const queryState = vi.hoisted(() => ({ accounts: [] as Account[] }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'accounts' ? queryState.accounts : [],
    isLoading: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderAccount(overrides: Partial<Account> = {}) {
  queryState.accounts = [{
    id: 'account-1', ownerId: 'owner', name: 'Мой счёт', accessMode: 'personal',
    kind: 'spending', currency: 'RUB', icon: null, initialBalance: 0,
    initialBalanceDate: '2026-09-08', createdAt: '', updatedAt: '',
    ...overrides,
  }]
  return renderToStaticMarkup(<AccountsPage />)
}

describe('AccountsPage list', () => {
  it('keeps the name and currency without the everyday account type or access text', () => {
    const markup = renderAccount()
    expect(markup).toContain('Мой счёт')
    expect(markup).toContain('<span>RUB</span>')
    expect(markup).not.toContain('Текущие средства')
    expect(markup).toContain('role="img" aria-label="Личный счёт"')
    expect(markup).not.toMatch(/>Личный(?: счёт)?</)
  })

  it.each([
    ['deposit', 'Вклад'],
    ['savings', 'Сбережения'],
    ['savings_account', 'Накопительный счёт'],
    ['investment', 'Инвестиции'],
  ] as const)('preserves the %s type after the currency', (kind, label) => {
    const markup = renderAccount({ kind })
    expect(markup).toContain(`class="account-list-kind">${label}</span>`)
    expect(markup.indexOf('<span>RUB</span>')).toBeLessThan(markup.indexOf(`>${label}</span>`))
  })

  it.each(['spending', 'savings', 'savings_account'] as const)('labels shared access and preserves share, conversion and total balances for %s', (kind) => {
    const markup = renderAccount({
      accessMode: 'shared', kind,
      balance: { native: 123, display: 2, totalNative: 246, totalDisplay: 4, displayCurrency: 'USD' },
    })
    expect(markup).toContain('role="img" aria-label="Совместный счёт"')
    expect(markup).not.toMatch(/>Совместный(?: счёт)?</)
    expect(markup).toContain('123')
    expect(markup).toContain('≈ ')
    expect(markup).toContain('Всего: ')
    expect(markup).toContain('246')
    expect(markup).toContain('/accounts/account-1/members')
  })

  it('shows a zero personal balance without total or redundant conversion', () => {
    const markup = renderAccount({
      balance: { native: 0, display: 0, totalNative: 0, totalDisplay: 0, displayCurrency: 'RUB' },
    })
    expect(markup).toContain(new Intl.NumberFormat(undefined, {
      style: 'currency', currency: 'RUB', maximumFractionDigits: 2,
    }).format(0))
    expect(markup).not.toContain('≈ ')
    expect(markup).not.toContain('Всего: ')
  })
})
