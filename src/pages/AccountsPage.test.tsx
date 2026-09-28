import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@/api/accounts'
import { accountKindShortLabel } from '@/lib/accountKind'
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
  it('shows personal access as an icon and the everyday account type without a text access label', () => {
    const markup = renderAccount()
    expect(markup).toContain('Мой счёт')
    expect(markup).not.toContain('<span>RUB</span>')
    expect(markup).toContain('role="img" aria-label="Личный счёт"')
    expect(markup).toContain('class="account-list-meta-text" title="Текущие средства">Текущие средства</span>')
    expect(markup).not.toContain('Личный ·')
  })

  it.each([
    ['deposit', 'Вклад'],
    ['savings', 'Сбережения'],
    ['savings_account', 'Накопительный счёт'],
    ['investment', 'Инвестиции'],
  ] as const)('shows the %s type without currency or a text access label', (kind, label) => {
    const markup = renderAccount({ kind })
    expect(markup).toContain(`title="${label}">${label}</span>`)
    expect(markup).not.toContain('Личный ·')
    expect(markup).not.toContain('<span>RUB</span>')
  })

  it.each(['spending', 'savings', 'savings_account'] as const)('labels shared access and preserves share, conversion and total balances for %s', (kind) => {
    const markup = renderAccount({
      accessMode: 'shared', kind,
      balance: { native: 123, display: 2, totalNative: 246, totalDisplay: 4, displayCurrency: 'USD' },
    })
    expect(markup).toContain('role="img" aria-label="Совместный счёт"')
    expect(markup).toContain(`title="${accountKindShortLabel(kind)}">${accountKindShortLabel(kind)}</span>`)
    expect(markup).not.toContain('Совместный ·')
    expect(markup).toContain('123')
    expect(markup).toContain('≈ ')
    expect(markup).not.toContain('Всего: ')
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

  it('links the account content to filtered transactions and keeps editing explicit', () => {
    const markup = renderAccount({ name: 'Семейный бюджет', accessMode: 'shared', kind: 'savings_account' })

    expect(markup).toContain('aria-label="Транзакции по счету Семейный бюджет"')
    expect(markup).toContain('account_ids=account-1&amp;account_kinds=savings_account&amp;include_shared=true&amp;period=')
    expect(markup).toContain('aria-label="Редактировать счёт Семейный бюджет"')
    expect(markup).toContain('/accounts/account-1/members')
  })
})
