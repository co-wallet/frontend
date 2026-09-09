import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Account } from '@/api/accounts'
import type { Category } from '@/api/categories'
import type { Transaction } from '@/api/transactions'
import { TransactionItem } from '@/components/TransactionItem'

const account: Account = {
  id: 'account-1',
  ownerId: 'user-1',
  name: 'Личная',
  accessMode: 'personal',
  kind: 'spending',
  currency: 'RUB',
  icon: null,
  initialBalance: 0,
  initialBalanceDate: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const category: Category = {
  id: 'category-1',
  userId: 'user-1',
  name: 'Продукты',
  type: 'expense',
  icon: 'preset:groceries',
  createdAt: '2026-01-01T00:00:00Z',
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    accountId: account.id,
    toAccountId: null,
    toAmount: null,
    type: 'expense',
    amount: 1000,
    currency: 'RUB',
    exchangeRate: null,
    defaultCurrency: 'RUB',
    defaultCurrencyAmount: 1000,
    categoryId: category.id,
    description: 'Магнит',
    date: '2026-09-02T00:00:00Z',
    createdBy: 'user-1',
    createdAt: '2026-09-02T00:00:00Z',
    shares: [],
    tags: [
      { id: 'tag-1', name: 'дом' },
      { id: 'tag-2', name: 'важное' },
    ],
    ...overrides,
  }
}

describe('TransactionItem', () => {
  it('prioritizes description and category over the generic transaction type', () => {
    const markup = renderToStaticMarkup(
      <TransactionItem
        tx={transaction()}
        account={account}
        category={category}
        defaultCurrency="RUB"
        currentUserId="user-1"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(markup).toContain('<h2>Магнит</h2>')
    expect(markup).toContain('<p>Продукты · Личная</p>')
    expect(markup).toContain('−1 000 ₽')
    expect(markup).toContain('#дом')
    expect(markup).toContain('#важное')
  })

  it('keeps visible and labelled alternatives to swipe actions', () => {
    const markup = renderToStaticMarkup(
      <TransactionItem
        tx={transaction()}
        account={account}
        category={category}
        defaultCurrency="RUB"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(markup).toContain('<button type="button"')
    expect(markup).toContain('aria-label="Изменить: Магнит"')
    expect(markup).toContain('aria-label="Удалить: Магнит"')
    expect(markup).toContain('Изменить')
    expect(markup).toContain('Удалить')
  })

  it('shows a user share and a converted amount for shared accounts', () => {
    const sharedAccount = { ...account, accessMode: 'shared' as const }
    const markup = renderToStaticMarkup(
      <TransactionItem
        tx={transaction({
          accountId: sharedAccount.id,
          amount: 100,
          currency: 'USD',
          defaultCurrency: 'RUB',
          defaultCurrencyAmount: 8000,
          shares: [{ userId: 'user-1', amount: 25, isCustom: true }],
        })}
        account={sharedAccount}
        category={category}
        defaultCurrency="RUB"
        currentUserId="user-1"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(markup).toContain('Ваша доля')
    expect(markup).toContain('−25 $')
    expect(markup).toContain('≈ −2 000 ₽')
  })

  it('uses the shared uncategorized icon preset when a category is missing', () => {
    const markup = renderToStaticMarkup(
      <TransactionItem
        tx={transaction({ categoryId: null, description: null })}
        account={account}
        defaultCurrency="RUB"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(markup).toContain('<h2>Без категории</h2>')
    expect(markup).toContain('aria-label="Без категории"')
    expect(markup).toContain('--account-icon-foreground:var(--account-icon-color-red)')
  })
})

// Links are independent controls so following a tag never activates the row button.
it('renders every tag as a separate forward link with an accessible label', () => {
  const markup = renderToStaticMarkup(
    <TransactionItem tx={transaction()} defaultCurrency="RUB"
      onEdit={vi.fn()} onDelete={vi.fn()}
      tagHref={(id) => `/transactions/filtered/1?tag_ids=${id}`} />,
  )
  expect(markup).toContain('href="/transactions/filtered/1?tag_ids=tag-1"')
  expect(markup).toContain('href="/transactions/filtered/1?tag_ids=tag-2"')
  expect(markup).toContain('aria-label="Транзакции с тегом важное"')
  expect(markup).not.toMatch(/<button[^>]*>[\s\S]*?<a[\s\S]*?<\/button>/)
})

it('shows incoming currency and amount with read-only actions and both account names', () => {
  const markup = renderToStaticMarkup(<TransactionItem tx={transaction({ type: 'transfer', readOnly: true,
    accountName: 'Отправитель', toAccountName: 'Получатель', toCurrency: 'EUR',
    currency: 'USD', amount: 100, toAmount: 90, shares: [], tags: [], description: null,
    defaultCurrency: null, defaultCurrencyAmount: null })} defaultCurrency="RUB" onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(markup).toContain('Отправитель → Получатель')
  expect(markup).toContain('+90 €')
  expect(markup).not.toContain('Изменить')
  expect(markup).not.toContain('Удалить')
  expect(markup).not.toContain('100 $')
})
