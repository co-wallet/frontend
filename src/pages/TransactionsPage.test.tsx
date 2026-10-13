import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { MemoryRouter, Route, Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from './TransactionsPage'
import type { Transaction } from '@/api/transactions'
import type { Currency } from '@/api/currencies'
import type { CategoryStat } from '@/api/analytics'
import { filterFromParams, periodFromParams } from '@/lib/transactionNavigation'
import type { TransactionPeriod } from '@/lib/transactionNavigation'
import { usePeriodStore } from '@/store/periodStore'

const swipe = vi.hoisted(() => ({
  value: undefined as TransactionPeriod | undefined,
  onChange: undefined as ((value: Partial<TransactionPeriod>) => void) | undefined,
  enabled: false,
}))
vi.mock('@/lib/usePeriodSwipe', () => ({
  usePeriodSwipe: (value: TransactionPeriod, onChange: typeof swipe.onChange, enabled: boolean) => {
    Object.assign(swipe, { value, onChange, enabled })
    return { current: null }
  },
}))

vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonCheckbox: (props: ComponentProps<typeof actual.IonCheckbox>) => {
      if (props.children === 'Показывать полные суммы') pagination.onAmountModeChange = props.onIonChange
      return <actual.IonCheckbox {...props} />
    },
    IonPopover: (props: ComponentProps<typeof actual.IonPopover>) => (
      <div className={props.className} data-trigger={props.trigger} data-reference={props.reference} data-alignment={props.alignment} aria-label={props['aria-label']}>
        {props.children}
      </div>
    ),
  }
})

const pagination = vi.hoisted(() => ({
  data: { pages: [] as Transaction[][] },
  isLoading: false,
  isError: false,
  isFetchNextPageError: false,
  hasNextPage: false,
  options: undefined as undefined | { queryKey: unknown[]; enabled: boolean },
  analyticsQueries: [] as { queryKey: unknown[]; enabled?: boolean }[],
  amountMode: 'share' as 'share' | 'total',
  setAmountMode: vi.fn(),
  onAmountModeChange: undefined as ComponentProps<typeof import('@ionic/react').IonCheckbox>['onIonChange'],
  chartGrouping: 'categories' as 'categories' | 'tags',
  currencies: [] as Currency[],
  missingAmounts: 0,
  categoryStats: [] as CategoryStat[],
  balance: 1250.5,
  summaryLoading: false,
  summaryError: false,
  accountsLoading: false,
  accountsError: false,
  onBalanceClick: undefined as (() => void) | undefined,
}))

it('anchors the analytics settings arrow to the trigger center', () => {
  const markup = renderToStaticMarkup(<MemoryRouter><TransactionsPage /></MemoryRouter>)
  expect(markup).toMatch(/data-trigger="transactions-analytics-settings" data-reference="trigger" data-alignment="center"/)
})
beforeEach(() => {
  pagination.data = { pages: [[]] }
  pagination.isError = false
  pagination.isFetchNextPageError = false
  pagination.hasNextPage = false
  pagination.options = undefined
  pagination.analyticsQueries = []
  pagination.amountMode = 'share'
  pagination.setAmountMode.mockClear()
  pagination.onAmountModeChange = undefined
  pagination.chartGrouping = 'categories'
  pagination.currencies = []
  pagination.missingAmounts = 0
  pagination.categoryStats = [{ categoryId: 'c1', categoryName: 'Продукты', amount: 125, icon: 'preset:groceries' }]
  pagination.balance = 1250.5
  pagination.summaryLoading = false
  pagination.summaryError = false
  pagination.accountsLoading = false
  pagination.accountsError = false
  pagination.onBalanceClick = undefined
})

vi.mock('react/jsx-dev-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react/jsx-dev-runtime')>()
  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      const props = args[1] as ComponentProps<'button'>
      if (args[0] === 'button' && props['aria-label'] === 'Показать все транзакции') {
        pagination.onBalanceClick = () => props.onClick?.({} as Parameters<NonNullable<typeof props.onClick>>[0])
      }
      return actual.jsxDEV(...args)
    },
  }
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
        ? pagination.categoryStats
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
          : queryKey[0] === 'currencies'
            ? pagination.currencies
            : queryKey[0] === 'analytics' && queryKey[1] === 'summary'
              ? { balance: pagination.balance, expenses: 4206828.86, income: 8022062.6, expensesMissingAmounts: pagination.missingAmounts, incomeMissingAmounts: 0 }
          : [],
    isLoading: queryKey[0] === 'accounts' ? pagination.accountsLoading
      : queryKey[1] === 'summary' && pagination.summaryLoading,
    isError: queryKey[0] === 'accounts' ? pagination.accountsError
      : queryKey[1] === 'summary' && pagination.summaryError,
    })
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/store/amountModeStore', () => ({ useAmountMode: () => ({ mode: pagination.amountMode, setMode: pagination.setAmountMode }) }))

function renderPage(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Route path="/transactions"><TransactionsPage /></Route>
    </MemoryRouter>,
  )
}

it('shows the owner login and transfer icon in an external transfer legend', () => {
  pagination.categoryStats = [{ categoryId: 'transfers:external', categoryName: "В 'Карта' · @wallet_demo", amount: 100 }]
  const markup = renderPage('/transactions?include_transfer_expenses=true')
  expect(markup).toContain('@wallet_demo')
  expect(markup).toContain('aria-label="Перевод"')
  expect(markup).toContain('var(--account-icon-color-blue)')
  expect(markup).not.toContain('Транзакции с тегом undefined')
})

describe('transaction account balance', () => {
  function balanceCard(path = '/transactions') {
    return renderPage(path).match(/<button[^>]*aria-label="Показать все транзакции"[\s\S]*?<\/button>/)![0]
  }

  it('shows the server balance before expenses and income for the selected accounts', () => {
    const markup = renderPage('/transactions?account_ids=a1,a2&include_shared=true')
    expect(markup.indexOf('aria-label="Показать все транзакции"')).toBeLessThan(markup.indexOf('aria-label="Показать расходы"'))
    expect(markup).not.toMatch(/<span>(Баланс|Расходы|Доходы)<\/span>/)
    expect(markup).not.toContain('Моя доля')
    expect(markup).toContain('>Аналитика за период<')
    const summary = markup.match(/<section class="summary-strip"[^>]*>([\s\S]*?)<\/section>/)![1]
    expect(summary).toContain('4 206 828,86 $')
    expect(summary).toContain('8 022 062,60 $')
    expect(summary).not.toContain('−4 206 828,86 $')
    expect(summary).not.toContain('+8 022 062,60 $')
    expect(summary).not.toContain('ion-icon')
    expect(markup).toContain('1 250,50 $')
    expect(balanceCard('/transactions?account_ids=a1,a2&include_shared=true')).toContain('aria-pressed="true"')
    const summaryQuery = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'summary')!
    expect(summaryQuery.queryKey[summaryQuery.queryKey.length - 1]).toMatchObject({ account_ids: 'a1,a2', currency: 'USD', amount_mode: 'share' })
  })

  it('uses the selected amount mode and formats a negative balance', () => {
    pagination.amountMode = 'total'
    pagination.balance = -10.25
    expect(balanceCard('/transactions?account_ids=a2&include_shared=true')).toContain('−10,25 $')
    const summary = pagination.analyticsQueries.find((query) => query.queryKey[1] === 'summary')!
    expect(summary.queryKey[summary.queryKey.length - 1]).toMatchObject({ account_ids: 'a2', amount_mode: 'total' })
  })

  it.each(['expense', 'income,transfer', 'transfer', undefined])('clears the %s type filter while preserving all other conditions', (types) => {
    const history = createMemoryHistory({ initialEntries: [
      '/transactions/filtered/2?account_ids=a1,a2&include_shared=true&account_kinds=spending&category_ids=c1&tag_ids=t1&tag_mode=and&include_transfer_expenses=true&include_transfer_income=false&period=custom&from=2026-08-01&to=2026-08-31'
        + (types ? `&types=${types}` : ''),
    ] })
    const before = new URLSearchParams(history.location.search)
    renderToStaticMarkup(<Router history={history}><Route path="/transactions"><TransactionsPage /></Route></Router>)
    pagination.onBalanceClick!()
    before.delete('types')
    expect(Object.fromEntries(new URLSearchParams(history.location.search))).toEqual(Object.fromEntries(before))
    expect(history.location.pathname).toBe('/transactions/filtered/2')
    expect(history.length).toBe(1)
    renderToStaticMarkup(<Router history={history}><Route path="/transactions"><TransactionsPage /></Route></Router>)
    expect(pagination.options?.queryKey[2]).not.toHaveProperty('types')
    expect(pagination.options?.queryKey[2]).toMatchObject({ accountIds: ['a1', 'a2'] })
  })

  it('shows an inactive balance card while filtering operations by type', () => {
    expect(balanceCard('/transactions?types=expense')).toContain('aria-pressed="false"')
  })

  it.each(['summaryLoading', 'accountsLoading'] as const)('shows a placeholder during %s', (state) => {
    pagination[state] = true
    expect(balanceCard()).toContain('<ion-skeleton-text')
    expect(balanceCard()).not.toContain('1 250,50 $')
  })

  it.each(['summaryError', 'accountsError'] as const)('shows an unavailable balance on %s', (state) => {
    pagination[state] = true
    expect(balanceCard()).toContain('>—</strong>')
    expect(balanceCard()).not.toContain('1 250,50 $')
  })

  it('shows zero when no accounts match instead of using cached summary data', () => {
    expect(balanceCard('/transactions?account_kinds=none')).toContain('>0 $</strong>')
    expect(pagination.analyticsQueries.every((query) => query.enabled === false)).toBe(true)
  })
})

describe('transaction navigation controls', () => {
  it('applies content swipes to the primary list period store', () => {
    const previous = usePeriodStore.getState()
    try {
      usePeriodStore.setState({ period: 'month', periodOffset: 0 })
      renderPage('/transactions?tag_ids=t1')
      expect(swipe.enabled).toBe(true)
      expect(swipe.value?.periodOffset).toBe(0)
      swipe.onChange!({ periodOffset: -1 })
      expect(usePeriodStore.getState().periodOffset).toBe(-1)
    } finally {
      usePeriodStore.setState(previous)
    }
  })

  it('updates the filtered period in the URL without changing filters, route, or global period', () => {
    const previous = usePeriodStore.getState()
    const history = createMemoryHistory({ initialEntries: [
      '/transactions/filtered/2?tag_ids=t1&account_ids=a1&period=month&offset=-1&include_shared=true',
    ] })
    renderToStaticMarkup(<Router history={history}><Route exact path="/transactions/filtered/:depth"><TransactionsPage /></Route></Router>)
    expect(swipe.enabled).toBe(true)
    swipe.onChange!({ periodOffset: -2 })
    const params = new URLSearchParams(history.location.search)
    expect(history.location.pathname).toBe('/transactions/filtered/2')
    expect(params.get('period')).toBe('month')
    expect(params.get('offset')).toBe('-2')
    expect(params.get('tag_ids')).toBe('t1')
    expect(params.get('account_ids')).toBe('a1')
    expect(params.get('include_shared')).toBe('true')
    expect(usePeriodStore.getState()).toEqual(previous)
    expect(history.length).toBe(1)
  })

  it('leaves transaction row gestures to period navigation while retaining tap-to-open', () => {
    pagination.data = { pages: [[{
      id: 'swipe-row', accountId: 'a1', type: 'expense', amount: 10, currency: 'USD',
      date: '2026-10-01', tags: [], shares: [],
    } as unknown as Transaction]] }
    const markup = renderPage('/transactions')
    expect(markup).not.toContain('ion-item-sliding')
    expect(markup).not.toContain('ion-item-option')
    expect(markup).toContain('class="transaction-item__open"')
  })

  it('offers both back navigation and the main menu in a filtered list', () => {
    const markup = renderPage('/transactions/filtered/1?tag_ids=travel')
    expect(markup).toContain('title="Назад"')
    expect(markup).toContain('aria-label="Назад"')
    expect(markup).toMatch(/<ion-fab[^>]*slot="fixed"[^>]*horizontal="start"/)
    expect(markup).toMatch(/<ion-buttons slot="start"><ion-menu-button[^>]*aria-label="Главное меню"/)
  })

  it('offers back to the dashboard and the menu in the primary transaction list', () => {
    const markup = renderPage('/transactions')
    expect(markup).toContain('<ion-menu-button')
    expect(markup).toContain('aria-label="Назад"')
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
  it('uses current rates for both rows and daily totals when the saved currency differs', () => {
    pagination.data.pages = [[{
      id: 'converted', accountId: 'a1', type: 'expense', amount: 80, currency: 'EUR',
      defaultCurrency: 'RUB', defaultCurrencyAmount: 8000,
      date: '2026-08-21', shares: [], tags: [],
    } as unknown as Transaction]]
    pagination.currencies = [{ code: 'EUR', name: 'Euro', isActive: false, rateToUsd: 0.8 }]
    const markup = renderPage('/transactions')
    expect(markup).toContain('<span class="transaction-item__amount transaction-item__amount--expense">−100 $</span>')
    const divider = markup.match(/<ion-item-divider[^>]*>([\s\S]*?)<\/ion-item-divider>/)?.[1]
    expect(divider).toContain('<ion-note slot="end">−100 $</ion-note>')
    expect(markup).not.toContain('Нет курса')
  })

  it('explains incomplete totals as a missing exchange rate', () => {
    pagination.missingAmounts = 1
    const markup = renderPage('/transactions')
    expect(markup).toContain('для 1 операций нет курса для пересчёта в USD')
    expect(markup).not.toContain('Укажите её в транзакциях')
  })

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


it('uses the saved total mode for all analytics and daily totals without changing transaction rows', () => {
  pagination.amountMode = 'total'
  pagination.data.pages = [[{
    id: 'shared-expense', accountId: 'a2', type: 'expense', amount: 100, currency: 'USD',
    date: '2026-10-01', shares: [{ userId: 'u1', amount: 25 }], tags: [],
  } as unknown as Transaction]]
  const markup = renderPage('/transactions?include_shared=true')
  for (const query of pagination.analyticsQueries) expect(query.queryKey[query.queryKey.length - 1]).toMatchObject({
    amount_mode: 'total', account_ids: 'a1,a2',
  })
  expect(markup).not.toContain('Полные суммы')
  const divider = markup.match(/<ion-item-divider[^>]*>([\s\S]*?)<\/ion-item-divider>/)?.[1]
  expect(divider).toContain('−100 $')
  expect(markup).toContain('<span class="transaction-item__amount transaction-item__amount--expense">−100 $</span>')
})


it.each(['expense', 'income'])('places amount mode alongside transfer visibility for %s', (type) => {
  const markup = renderPage(`/transactions?types=${type}`)
  const settings = markup.match(/<div class="transactions-analytics__popover-content">([\s\S]*?)<\/div>/)?.[1]
  expect(settings).toMatch(/Отображать переводы[^]*Показывать полные суммы/)
  expect(settings).toContain('checked="false"')
})

it('changes amount mode immediately through display settings without changing URL filters', () => {
  const history = createMemoryHistory({ initialEntries: ['/transactions?account_ids=a1&tag_ids=t1'] })
  const before = history.location.search
  renderToStaticMarkup(<Router history={history}><Route path="/transactions"><TransactionsPage /></Route></Router>)
  expect(pagination.onAmountModeChange).toBeTypeOf('function')
  for (const checked of [true, false]) {
    pagination.onAmountModeChange!({ detail: { checked } } as Parameters<NonNullable<typeof pagination.onAmountModeChange>>[0])
  }
  expect(pagination.setAmountMode.mock.calls).toEqual([['total'], ['share']])
  expect(history.location.search).toBe(before)
  expect(history.length).toBe(1)
})
