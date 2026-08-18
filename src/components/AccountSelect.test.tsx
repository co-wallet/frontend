import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Account } from '@/api/accounts'

import { AccountSelect } from './AccountSelect'

const accounts: Account[] = [
  {
    id: 'account-1',
    ownerId: 'user-1',
    name: 'TBank',
    accessMode: 'personal',
    kind: 'spending',
    currency: 'RUB',
    icon: 'custom:TBank|purple|orange',
    initialBalance: 0,
    initialBalanceDate: '2026-08-18T00:00:00Z',
    createdAt: '2026-08-18T00:00:00Z',
    updatedAt: '2026-08-18T00:00:00Z',
  },
  {
    id: 'account-2',
    ownerId: 'user-1',
    name: 'Кредитная карта',
    accessMode: 'personal',
    kind: 'spending',
    currency: 'RUB',
    icon: 'preset:credit-card',
    initialBalance: 0,
    initialBalanceDate: '2026-08-18T00:00:00Z',
    createdAt: '2026-08-18T00:00:00Z',
    updatedAt: '2026-08-18T00:00:00Z',
  },
]

describe('AccountSelect', () => {
  it('renders the selected account with its visual icon instead of the storage value', () => {
    const markup = renderToStaticMarkup(
      <AccountSelect
        label="Счёт"
        accounts={accounts}
        value="account-1"
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('aria-label="Счёт: TBank"')
    expect(markup).toContain('TBank · RUB')
    expect(markup).toContain('--account-icon-foreground:var(--account-icon-color-purple)')
    expect(markup).not.toContain('custom:TBank|purple|orange')
  })

  it('shows an explicit placeholder when no account is selected', () => {
    const markup = renderToStaticMarkup(
      <AccountSelect
        label="На счёт"
        accounts={accounts}
        value=""
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('На счёт: не выбран')
    expect(markup).toContain('Выберите счёт')
  })
})
