import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { MemoryRouter, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from './TransactionsPage'
import type { Transaction } from '@/api/transactions'
import { filterFromParams, periodFromParams } from '@/lib/transactionNavigation'

vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonPopover: (props: {
    children: ReactNode
    className?: string
    trigger?: string
    'aria-label'?: string
  }) => (
    <div
      className={props.className}
      data-trigger={props.trigger}
      aria-label={props['aria-label']}
    >
      {props.children}
    </div>
  ),
}))

const pagination = vi.hoisted(() => ({
  data: { pages: [] as Transaction[][] },
  isLoading: false,
  isError: false,
  isFetchNextPageError: false,
  hasNextPage: false,
  options: undefined as undefined | { queryKey: unknown[]; enabled: boolean },
  analyticsQueries: [] as { queryKey: unknown[]; enabled?: boolean }[],
  chartGrouping: 'categories' as 'categories' | 'tags',
}))
beforeEach(() => {
  pagination.data = { pages: [[]] }
  pagination.isError = false
  pagination.isFetchNextPageError = false
  pagination.hasNextPage = false
  pagination.options = undefined
  pagination.analyticsQueries = []
  pagination.chartGrouping = 'categories'
})

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(
      initial === 'categories' ? pagination.chartGrouping : initial,
    ),
  }
})

vi.mock('@/lib/useChartTheme', () => ({
  useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }),
}))
vi.mock('@tanstack/react-query', () => ({
  infiniteQueryOptions: (options: unknown) => options,
  useInfiniteQuery: (options: typeof pagination.options) => {
    pagination.options = options
    return pagination
  },
  useQuery: ({ queryKey, enabled }: { queryKey: string[]; enabled?: boolean }) => {
    if (queryKey[0] === 'analytics') pagination.analyticsQueries.push({ queryKey, enabled })
    return ({
    data: queryKey[0] === 'analytics' && queryKey[1] === 'by-tag'
      ? [
        { tagId: 't1', tagName: 'путешествия', amount: 125 },
        { tagId: 'untagged', tagName: 'Без тегов', amount: 75 },
      ]
      : queryKey[0] === 'analytics' && queryKey[1] === 'by-category'
        ? [{ categoryId: 'c1', categoryName: 'Продукты', amount: 125, icon: 'preset:groceries' }]
      : queryKey[0] === 'accounts'
      ? [
        { id: 'a1', name: 'Личная', kind: 'spending', accessMode: 'personal' },
        { id: 'a2', name: 'Общая', kind: 'spending', accessMode: 'shared' },
        { id: 'a3', name: 'Инвестиции', kind: 'investment', accessMode: 'personal' },
      ]
      : queryKey[0] === 'categories' && queryKey[1] === 'expense'
        ? [{ id: 'c1', name: 'Продукты' }, { id: 'c2', name: 'Кафе' }]
        : queryKey[0] === 'tags'
          ? [{ id: 't1', name: 'путешествия' }, { id: 't2', name: 'япония' }]
          : [],
    isLoading: false,
    })
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

function renderPage(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Route path="/transactions"><TransactionsPage /></Route>
    </MemoryRouter>,
  )
}

describe('transaction navigation controls', () => {
  it('offers both back navigation and the main menu in a filtered list', () => {
    const markup = renderPage('/transactions/filtered/1?tag_ids=travel')
    expect(markup).toContain('<ion-back-button')
    expect(markup).toContain('text=""')
    expect(markup).toContain('aria-label="Назад"')
    expect(markup).toMatch(/<ion-buttons slot="start"><ion-back-button[^>]*><\/ion-back-button><\/ion-buttons>/)
    expect(markup).toMatch(/<ion-buttons slot="end"><ion-menu-button[^>]*aria-label="Главное меню"/)
  })

  it('offers back to the dashboard and the menu in the primary transaction list', () => {
    const markup = renderPage('/transactions')
    expect(markup).toContain('<ion-menu-button')
    expect(markup).toContain('<ion-back-button default-href="/dashboard"')
  })

  it('offers separate quick actions for expense, income and transfer', () => {
    const markup = renderPage('/transactions?account_ids=a1')
    expect(markup).toContain('aria-label="Добавить расход"')
    expect(markup).toContain('aria-label="Добавить доход"')
    expect(markup).toContain('aria-label="Добавить перевод"')
  })
})

describe('transaction analytics grouping', () => {
  it('places the contextual transfer setting beside the analytics heading', () => {
    const markup = renderPage('/transactions?include_transfer_expenses=true')
    expect(markup).toContain('id="transactions-analytics-settings"')
    expect(markup).toContain('aria-label="Настройки расходов"')
    expect(markup).toContain('class="transactions-analytics__popover"')
    expect(markup).toContain('Отображать переводы')
    expect(markup).toContain('checked="true"')
    expect(markup).not.toContain('Переводы в суммах')
    expect(markup).not.toContain('Учитывать в расходах')
    expect(markup).not.toContain('Учитывать в доходах')
  })

  it('offers category and tag grouping without requesting tags by default', () => {
    const markup = renderPage('/transactions')
    expect(markup).not.toContain('aria-label="Тип аналитики"')
    expect(markup).toContain('aria-label="Группировка аналитики"')
    expect(markup).toContain('value="categories"')
    expect(markup).toContain('value="tags"')
    const tagQuery = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'by-tag')
    expect(tagQuery?.enabled).toBe(false)
  })

  it('uses summary cards as contextual type filters with transfer preferences', () => {
    const expenseMarkup = renderPage('/transactions?types=expense,transfer&include_transfer_expenses=true')
    expect(expenseMarkup).toContain('aria-label="Убрать фильтр расходов"')
    expect(expenseMarkup).toContain('aria-pressed="true"')
    expect(pagination.options?.queryKey[2]).toMatchObject({ types: ['expense', 'transfer'] })

    const incomeMarkup = renderPage('/transactions?types=income,transfer')
    expect(incomeMarkup).toContain('aria-label="Убрать фильтр доходов"')
    expect(incomeMarkup).toContain('aria-label="Настройки доходов"')
    expect(incomeMarkup).not.toContain('aria-label="Тип аналитики"')
  })

  it('links a category legend entry to the filtered list with existing filters', () => {
    const markup = renderPage('/transactions?types=expense&account_ids=a1&period=custom&from=2026-08-01&to=2026-08-31')
    expect(markup).toContain('aria-label="Транзакции категории Продукты"')
    const href = markup.match(/href="([^"]*category_ids=c1[^"]*)"/)?.[1].replace(/&amp;/g, '&')
    expect(href).toBeDefined()
    expect(filterFromParams(new URL(href!, 'http://localhost').searchParams)).toMatchObject({
      accountIds: ['a1'],
      categoryIds: ['c1'],
      types: ['expense'],
    })
  })

  it('uses all active filters for tag analytics and links a tag to the filtered list', () => {
    pagination.chartGrouping = 'tags'
    const markup = renderPage('/transactions/filtered/1?account_ids=a1&category_ids=c1&tag_ids=t2&tag_mode=and&period=custom&from=2026-08-01&to=2026-08-31&include_transfer_expenses=true')
    expect(markup).toContain('#путешествия')
    expect(markup).toContain('Без тегов')
    expect(markup).toContain('aria-label="Транзакции с тегом путешествия"')
    expect(markup).toContain('aria-label="Транзакции без тегов"')

    const tagQuery = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'by-tag')
    expect(tagQuery?.queryKey[tagQuery.queryKey.length - 1]).toMatchObject({
      account_ids: 'a1',
      category_ids: 'c1',
      tag_ids: 't2',
      tag_mode: 'and',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
      include_transfer_expenses: true,
    })

    const href = markup.match(/href="([^"]*\/transactions\/filtered\/2[^"]*)"/)?.[1].replace(/&amp;/g, '&')
    expect(href).toBeDefined()
    const params = new URL(href!, 'http://localhost').searchParams
    expect(filterFromParams(params)).toMatchObject({
      accountIds: ['a1'],
      categoryIds: ['c1'],
      tagIds: ['t1'],
      includeTransferExpenses: true,
    })
    expect(periodFromParams(params, {
      period: 'month', periodOffset: 0, customFrom: '', customTo: '',
    })).toEqual({
      period: 'custom', periodOffset: 0, customFrom: '2026-08-01', customTo: '2026-08-31',
    })

    const untaggedHref = [...markup.matchAll(/href="([^"]*without_tags=true[^"]*)"/g)][0]?.[1].replace(/&amp;/g, '&')
    expect(untaggedHref).toBeDefined()
    expect(filterFromParams(new URL(untaggedHref!, 'http://localhost').searchParams)).toMatchObject({
      accountIds: ['a1'],
      categoryIds: ['c1'],
      withoutTags: true,
      includeTransferExpenses: true,
    })
  })
})


describe('active filter summary', () => {
  it('shows a clear unfiltered state without empty groups', () => {
    const markup = renderPage('/transactions')
    expect(markup).toContain('Текущие средства · личные счета')
    expect(markup.match(/\. Открыть фильтры"/g)).toHaveLength(1)
    expect(markup).not.toContain('Сбросить все')
    expect(pagination.options?.queryKey[2]).toMatchObject({ accountIds: ['a1'] })
    expect(pagination.options?.enabled).toBe(true)
  })

  it('shows one value per type with independent overflow counts', () => {
    const markup = renderPage('/transactions?account_ids=a1,a2,a3&category_ids=c1,c2&tag_ids=t1,t2&tag_mode=and')
    expect(markup).toContain('aria-label="Счета:')
    expect(markup).toContain('aria-label="Категории:')
    expect(markup).toContain('aria-label="Теги:')
    expect(markup.match(/\. Открыть фильтры"/g)).toHaveLength(4)
    expect(markup).toContain('Личная')
    expect(markup).toContain('Продукты')
    expect(markup).toContain('#путешествия')
    expect(markup).not.toContain('Кредитный')
    expect(markup).not.toContain('Инвестиции')
    expect(markup).not.toContain('Кафе')
    expect(markup).not.toContain('#япония')
    expect(markup).toContain('Счета: Личная, ещё 2. Открыть фильтры')
    expect(markup).toContain('Категории: Продукты, ещё 1. Открыть фильтры')
    expect(markup).toContain('Теги: #путешествия, ещё 1. Открыть фильтры')
    expect(markup).not.toContain('Сбросить все')
  })

  it('intersects selected account kinds with shared visibility and explicit accounts', () => {
    renderPage('/transactions?account_ids=a2,a3&account_kinds=investment&include_shared=true')
    expect(pagination.options?.queryKey[2]).toMatchObject({ accountIds: ['a3'] })
    const summary = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'summary')
    expect(summary?.queryKey[summary.queryKey.length - 1]).toMatchObject({ account_ids: 'a3' })
  })

  it('uses only shared accounts for the list, analytics, and filter summary', () => {
    const markup = renderPage('/transactions?include_shared=true&only_shared=true')
    expect(markup).toContain('Текущие средства · общие счета')
    expect(pagination.options?.queryKey[2]).toMatchObject({ accountIds: ['a2'] })
    const summary = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'summary')
    expect(summary?.queryKey[summary.queryKey.length - 1]).toMatchObject({ account_ids: 'a2' })
  })

  it('disables list and analytics requests when no account kinds are selected', () => {
    const markup = renderPage('/transactions?account_kinds=none')
    expect(markup).toContain('Типы средств не выбраны')
    expect(pagination.options?.enabled).toBe(false)
    expect(pagination.analyticsQueries.every((query) => query.enabled === false)).toBe(true)
  })

  it('passes independent transfer preferences to summary analytics', () => {
    renderPage('/transactions?include_transfer_expenses=true&include_transfer_income=false')
    const summary = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'summary')
    expect(summary?.queryKey[summary.queryKey.length - 1]).toMatchObject({
      include_transfer_expenses: true,
      include_transfer_income: false,
    })
  })

  it('omits empty types and overflow for a single selected value', () => {
    const markup = renderPage('/transactions?tag_ids=t1')
    expect(markup).toContain('aria-label="Теги:')
    expect(markup).not.toContain('aria-label="Счета:')
    expect(markup).not.toContain('aria-label="Категории:')
    expect(markup).not.toContain('Ещё')
    expect(markup).toContain('aria-label="Теги: #путешествия. Открыть фильтры"')
    expect(markup).toContain('title="Теги: #путешествия"')
  })

  it('shows the without-tags filter as an active condition', () => {
    const markup = renderPage('/transactions?without_tags=true')
    expect(markup).toContain('aria-label="Теги: Без тегов. Открыть фильтры"')
    expect(pagination.options?.queryKey[2]).toMatchObject({ withoutTags: true })
  })

  it('keeps unknown selections visible and counted while dictionaries are unavailable', () => {
    const markup = renderPage('/transactions?account_ids=unknown,other&category_ids=missing&tag_ids=unavailable')
    expect(markup).toContain('aria-label="Счета: Счёт, ещё 1. Открыть фильтры"')
    expect(markup).toContain('aria-label="Категории: Категория. Открыть фильтры"')
    expect(markup).toContain('#Тег')
    expect(markup).toContain('Счета: Счёт, ещё 1. Открыть фильтры')
  })
})


describe('paginated transaction list', () => {
  function transaction(id: string): Transaction {
    return {
      id, accountId: 'a1', type: 'expense', amount: 10, currency: 'USD',
      date: '2026-08-21', description: `Operation ${id}`, shares: [], tags: [],
    } as unknown as Transaction
  }

  it('merges a day split across two pages under a single heading', () => {
    pagination.data.pages = [[transaction('first')], [transaction('second')]]
    const markup = renderPage('/transactions')
    expect(markup).toContain('Operation first')
    expect(markup).toContain('Operation second')
    expect(markup.match(/class="transactions-date-divider__date"/g)).toHaveLength(1)
  })

  it('keeps loaded rows visible and offers retry when the next page fails', () => {
    pagination.data.pages = [[transaction('first')]]
    pagination.isError = true
    pagination.isFetchNextPageError = true
    pagination.hasNextPage = true
    const markup = renderPage('/transactions')
    expect(markup).toContain('Operation first')
    expect(markup).toContain('Не удалось загрузить следующие транзакции.')
    expect(markup).toContain('Повторить')
    expect(markup).not.toContain('<h2>Не удалось загрузить транзакции</h2>')
  })
})


it('passes the effective account selection to transfer amount presentation', () => {
  pagination.data.pages = [[{
    id: 'transfer', accountId: 'a1', toAccountId: 'a3', type: 'transfer',
    amount: 100, currency: 'USD', toAmount: 90, toCurrency: 'EUR',
    date: '2026-08-21', shares: [], tags: [],
  } as unknown as Transaction]]
  const destination = renderPage('/transactions?account_ids=a3&account_kinds=investment')
  expect(destination).toContain('<span class="transaction-item__amount transaction-item__amount--transfer">90 €</span>')
  expect(destination).toContain('<span class="transaction-item__amount-meta">100 $</span>')
  const source = renderPage('/transactions?account_ids=a1')
  expect(source).toContain('<span class="transaction-item__amount transaction-item__amount--transfer">100 $</span>')
  expect(source).toContain('<span class="transaction-item__amount-meta">90 €</span>')
})
