import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { filterFromParams, periodFromParams, type TransactionPeriod } from '@/lib/transactionNavigation'
import type { ComponentProps } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'

vi.mock('@/api/auth', () => ({ authApi: { updateMe: vi.fn() } }))
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonPopover: (props: ComponentProps<typeof actual.IonPopover>) => {
      queryState.popovers.push(props)
      return <actual.IonPopover {...props} />
    },
    IonSelect: (props: ComponentProps<typeof actual.IonSelect>) => {
      if (props['aria-label'] === 'Валюта') queryState.onCurrencyChange = props.onIonChange
      return <actual.IonSelect {...props} />
    },
  }
})

vi.mock('@/lib/useChartTheme', () => ({ useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }) }))

const queryState = vi.hoisted(() => ({
  popovers: [] as ComponentProps<typeof import('@ionic/react').IonPopover>[],
  selectedKinds: ['spending'] as string[],
  includeShared: false,
  amountMode: 'share' as 'share' | 'total',
  accountsLoading: false,
  accountsError: false,
  onlyShared: false,
  analyticsQueries: [] as { params: Record<string, unknown>; enabled: boolean }[],
  transactionQueries: [] as { filter: Record<string, unknown>; enabled: boolean }[],
  chartMode: 'balance' as 'balance' | 'expenses' | 'income',
  transferVisibility: { expenses: false, income: true },
  summary: { balance: 10, expenses: 10, income: 0 },
  categoryStats: undefined as { categoryId: string; categoryName: string; amount: number }[] | undefined,
  onCurrencyChange: undefined as ComponentProps<typeof import('@ionic/react').IonSelect>['onIonChange'],
  period: { period: 'month', periodOffset: 0, customFrom: '2026-01-01', customTo: '2026-01-10' } as TransactionPeriod,
}))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(Array.isArray(initial) && initial[0] === 'spending' ? queryState.selectedKinds : initial === false ? queryState.includeShared : initial === 'balance' ? queryState.chartMode : (typeof initial === 'object' && initial !== null && 'expenses' in initial && 'income' in initial) ? queryState.transferVisibility : initial),
  }
})
vi.mock('@/store/periodStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/store/periodStore')>(),
  usePeriodStore: () => ({ ...queryState.period, setPeriod: vi.fn(), setPeriodOffset: vi.fn(), setCustomFrom: vi.fn(), setCustomTo: vi.fn() }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
    if (queryKey[0] === 'analytics') queryState.analyticsQueries.push({ params: queryKey[queryKey.length - 1] as Record<string, unknown>, enabled: Boolean(enabled) })
    if (queryKey[0] === 'transactions') queryState.transactionQueries.push({ filter: queryKey[queryKey.length - 1] as Record<string, unknown>, enabled: Boolean(enabled) })
    if (queryKey[0] === 'accounts') return { isLoading: queryState.accountsLoading, isError: queryState.accountsError, data: [
      { id: 'spending', name: 'Личная', kind: 'spending', accessMode: 'personal', currency: 'USD', balance: { display: 10 } },
      { id: 'deposit', name: 'Вклад', kind: 'deposit', accessMode: 'personal', currency: 'USD', balance: { display: 10 } },
      { id: 'shared', name: 'Общий кошелёк', kind: 'spending', accessMode: 'shared', currency: 'USD', balance: { display: 30 } },
      { id: 'shared-deposit', name: 'Общий вклад', kind: 'deposit', accessMode: 'shared', currency: 'USD', balance: { display: 40 } },
      { id: 'savings', name: 'Резерв', kind: 'savings', accessMode: 'personal', currency: 'USD', balance: { display: 50 } },
      { id: 'shared-savings-account', name: 'Общий накопительный', kind: 'savings_account', accessMode: 'shared', currency: 'USD', balance: { display: 60, totalDisplay: 240 } },
    ].filter((account) => !queryState.onlyShared || account.accessMode === 'shared') }
    if (queryKey[1] === 'by-category') return { data: queryState.categoryStats ?? [
      { categoryId: 'transfers:bank', categoryName: queryKey[2] === 'expense' ? "В 'Банк'" : "Из 'Банк'", amount: 50 },
    ] }
    if (queryKey[1] === 'summary') return { data: queryState.summary }
    return { data: [] }
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: (options: { mutationFn: (code: string) => unknown }) => ({ mutate: (code: string) => options.mutationFn(code) }),
}))
vi.mock('@/store/amountModeStore', () => ({ useAmountMode: () => ({ mode: queryState.amountMode, setMode: vi.fn() }) }))
const initialPeriod = { ...queryState.period }
afterEach(() => { useAuthStore.setState({ user: null }); vi.clearAllMocks() })
afterEach(() => { queryState.popovers = [] })
afterEach(() => { queryState.summary = { balance: 10, expenses: 10, income: 0 } })
afterEach(() => { queryState.categoryStats = undefined })
afterEach(() => { queryState.amountMode = 'share'; queryState.selectedKinds = ['spending']; queryState.includeShared = false; queryState.accountsLoading = false; queryState.accountsError = false; queryState.onlyShared = false; queryState.analyticsQueries = []; queryState.transactionQueries = []; queryState.period = initialPeriod; queryState.chartMode = 'balance'; queryState.transferVisibility = { expenses: false, income: true } })


describe('Dashboard summary cards', () => {
  it.each([
    { kinds: ['spending'] }, { kinds: ['deposit'] }, { kinds: ['spending', 'savings'] }, { kinds: [] },
  ])('keeps an accessible balance name without visible headings for account kinds $kinds', ({ kinds }) => {
    queryState.selectedKinds = kinds
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('aria-label="Показать баланс"')
    expect(markup).not.toContain('<span>Баланс</span>')
    expect(markup).not.toContain('<span>Расходы</span>')
    expect(markup).not.toContain('<span>Доходы</span>')
    expect(markup).not.toContain('Доступно')
  })

  it('renders full large and negative amounts in all three cards', () => {
    queryState.summary = { balance: -142001.98, expenses: 123456789.12, income: 9876543.21 }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    const strip = markup.match(/<section class="summary-strip"[^>]*>([\s\S]*?)<\/section>/)![1]
    const amounts = [...strip.matchAll(/<strong[^>]*>([^<]+)<\/strong>/g)].map((match) => match[1])
    expect(amounts).toEqual(['−142 001,98 $', '123 456 789,12 $', '9 876 543,21 $'])
    expect(strip).not.toContain('ion-icon')
  })
})

describe('Dashboard period visibility', () => {
  it.each(['balance', 'expenses', 'income'] as const)('uses the same chart layout and period controls in %s', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('class="dashboard-chart-plot"')
    expect(markup).toContain('Период транзакций')
    expect(markup).not.toContain('dashboard-chart-plot--compact')
    expect(markup).not.toContain('dashboard-balance-content')
    expect(markup).not.toContain('dashboard-view-controls')
    const toolbar = markup.match(/<div class="dashboard-chart-toolbar"[\s\S]*?<\/ion-card>/)![0]
    expect(toolbar).toContain('id="dashboard-kind-filter"')
    expect(toolbar).toContain('aria-label="Валюта"')
    expect(toolbar).toContain('id="dashboard-chart-settings"')
    expect(toolbar.indexOf('dashboard-kind-filter')).toBeLessThan(toolbar.indexOf('aria-label="Валюта"'))
    expect(toolbar.indexOf('aria-label="Валюта"')).toBeLessThan(toolbar.indexOf('dashboard-chart-settings'))
  })
  it('keeps the base profile currency when selecting another display currency', () => {
    useAuthStore.setState({ user: {
      id: 'user', username: 'user', email: 'user@example.test', defaultCurrency: 'RUB',
      isAdmin: false, isActive: true, createdAt: '', updatedAt: '',
    } })
    renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(queryState.onCurrencyChange).toBeTypeOf('function')
    queryState.onCurrencyChange?.({ detail: { value: 'EUR' } } as Parameters<NonNullable<typeof queryState.onCurrencyChange>>[0])
    expect(authApi.updateMe).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user?.defaultCurrency).toBe('RUB')
  })

  it('shows period controls in the initial balance view', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('Баланс по счетам')
    expect(markup).not.toMatch(/<ion-card-title[^>]*>Баланс по счетам/)
    expect(markup).not.toContain('Моя доля')
    expect(markup).toContain('Предыдущий период')
    expect(markup).toContain('Период транзакций')
  })

  it.each(['expenses', 'income'] as const)('places period controls below summary cards in %s mode', (mode) => {
    queryState.chartMode = mode
    queryState.period = { period: 'custom', periodOffset: 0, customFrom: '2026-08-01', customTo: '2026-08-20' }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toMatch(/class="summary-strip"[^]*<section[^>]*aria-label="Период транзакций"[^>]*>[^]*Предыдущий период[^]*aria-label="День"[^]*aria-label="Год"[^]*<\/section>[^]*(Расходы|Доходы) по категориям/)
    expect(markup).toContain('Выбрать период. Сейчас: 01.08.26 - 20.08.26')
    expect(queryState.analyticsQueries[queryState.analyticsQueries.length - 1]?.params).toMatchObject({ date_from: '2026-08-01', date_to: '2026-08-20' })
  })
})

describe('Dashboard quick transaction actions', () => {
  it('offers expense, income and transfer actions', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('aria-label="Добавить расход"')
    expect(markup).toContain('aria-label="Добавить доход"')
    expect(markup).toContain('aria-label="Добавить перевод"')
  })
})


describe('Dashboard transfer visibility', () => {
  it.each(['balance', 'expenses', 'income'] as const)('anchors the %s settings arrow to the trigger center', (mode) => {
    queryState.chartMode = mode
    renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(queryState.popovers.find((popover) => popover.trigger === 'dashboard-chart-settings')).toMatchObject({
      reference: 'trigger', side: 'bottom', alignment: 'center',
    })
  })

  it.each(['expenses', 'income'] as const)('shows the independent default for %s', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain(mode === 'expenses' ? 'aria-label="Настройки расходов"' : 'aria-label="Настройки доходов"')
    expect(markup).toContain('id="dashboard-chart-settings"')
    expect(markup).toContain('aria-haspopup="dialog"')
    expect(markup).not.toContain('Отображать переводы')
    expect(markup).not.toContain('dashboard-transfer-hint')
    const periodControls = markup.match(/<section[^>]*aria-label="Период транзакций"[^>]*>[^]*?<\/section>/)?.[0]
    expect(periodControls).not.toContain('ion-checkbox')
    const chartCard = markup.match(/<ion-card aria-label="(Расходы|Доходы) по категориям"[^>]*>[^]*?<\/ion-card>/)?.[0]
    expect(chartCard).toContain('id="dashboard-chart-settings"')
    expect(chartCard).not.toContain('ion-card-header')
    expect(queryState.analyticsQueries[queryState.analyticsQueries.length - 1]?.params).toMatchObject({ include_transfer_expenses: false, include_transfer_income: true })
  })

  it('uses both changed preferences in analytics queries', () => {
    queryState.chartMode = 'expenses'
    queryState.transferVisibility = { expenses: true, income: false }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('aria-label="Настройки расходов"')
    expect(queryState.analyticsQueries[queryState.analyticsQueries.length - 1]?.params).toMatchObject({ include_transfer_expenses: true, include_transfer_income: false })
  })

  it('hides the transfer control for balance', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).not.toContain('Отображать переводы')
    expect(markup).toContain('aria-label="Настройки баланса"')
    expect(markup).toContain('dashboard-chart-settings')
  })
})


it.each(['expenses', 'income'] as const)('shows account names and a fixed transfer icon in %s', (mode) => {
  queryState.chartMode = mode
  const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(markup).toContain(mode === 'expenses' ? "В &#x27;Банк&#x27;" : "Из &#x27;Банк&#x27;")
  expect(markup).toContain('aria-label="Перевод"')
  expect(markup).toMatch(/<span class="account-icon" role="img" aria-label="Перевод"[^>]*--account-icon-foreground:var\(--account-icon-color-blue\)[^>]*--account-icon-border:var\(--account-icon-color-blue\)/)
  expect(markup).not.toContain('ion-card-title>Переводы')
})


describe('Dashboard analytics scope', () => {
  it.each(['balance', 'expenses', 'income'] as const)('does not request or render tag analytics in %s mode', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).not.toContain('по тегам')
    expect(queryState.analyticsQueries).toHaveLength(3)
  })
})


describe('Dashboard recent transactions', () => {
  it('places recent transactions after the balance chart', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toMatch(/Баланс по счетам[^]*Последние транзакции/)
    expect(markup).toContain('Все транзакции')
    expect(markup).toContain('account_kinds=spending')
    expect(queryState.transactionQueries[0]?.filter).toHaveProperty('dateFrom')
    expect(queryState.transactionQueries[0]?.filter).toHaveProperty('dateTo')
  })

  it.each(['balance', 'expenses', 'income'] as const)('shows recent transactions after the chart in %s mode', (mode) => {
    queryState.chartMode = mode
    queryState.period = { period: 'custom', periodOffset: 0, customFrom: '2026-08-01', customTo: '2026-08-20' }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    const chartTitle = mode === 'balance' ? 'Баланс по счетам' : mode === 'expenses' ? 'Расходы по категориям' : 'Доходы по категориям'
    expect(markup).toMatch(new RegExp(`${chartTitle}[^]*Последние транзакции`))
    expect(markup).toContain('Все транзакции')
    expect(markup).toContain('period=custom')
    expect(markup).toContain('from=2026-08-01')
    expect(markup).toContain('to=2026-08-20')
    expect(queryState.transactionQueries[0]?.filter).toMatchObject({
      accountIds: ['spending'],
      dateFrom: '2026-08-01',
      dateTo: '2026-08-20',
    })
  })

  it('preserves account scope and transfer settings in the full-list link', () => {
    queryState.chartMode = 'expenses'
    queryState.selectedKinds = ['deposit', 'investment']
    queryState.includeShared = true
    queryState.transferVisibility = { expenses: true, income: false }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).not.toContain('account_ids=')
    expect(markup).toContain('account_kinds=deposit%2Cinvestment')
    expect(markup).toContain('include_shared=true')
    expect(markup).toContain('include_transfer_expenses=true')
    expect(markup).toContain('include_transfer_income=false')
  })
})

describe('Dashboard account transaction navigation', () => {
  it('makes every balance legend account a filtered transaction link', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)

    expect(markup).toContain('<ion-router-link')
    expect(markup).toMatch(/<ion-router-link[^>]*><div class="dashboard-chart-legend-row dashboard-chart-legend-row--link">/)
    expect(markup).toContain('aria-label="Транзакции по счету Личная"')
    expect(markup).toContain('account_ids=spending&amp;account_kinds=all&amp;include_shared=true&amp;period=month')
  })

  it('does not turn category legend entries into account links', () => {
    queryState.chartMode = 'expenses'
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)

    expect(markup).not.toContain('aria-label="Транзакции по счету')
  })
})

describe('Dashboard category legend navigation', () => {
  it.each(['expenses', 'income'] as const)('links uncategorized %s with the current scope and period', (mode) => {
    queryState.chartMode = mode
    queryState.categoryStats = [{ categoryId: 'uncategorized', categoryName: 'Без категории', amount: 100 }]
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    const href = markup.match(/href="([^"]*without_category=true[^"]*)"/)![1].replace(/&amp;/g, '&')
    expect(filterFromParams(new URL(href, 'http://localhost').searchParams)).toEqual({
      withoutCategory: true, accountKinds: ['spending'],
    })
    expect(markup).toContain('Без категории')
  })
  it.each(['expenses', 'income'] as const)('links %s categories with the current period and account scope', (mode) => {
    queryState.chartMode = mode
    queryState.categoryStats = [
      { categoryId: 'category-1', categoryName: 'Путешествия', amount: 100 },
      { categoryId: 'category-2', categoryName: 'Путешествия', amount: 50 },
    ]
    queryState.selectedKinds = ['spending', 'deposit']
    queryState.includeShared = true
    queryState.transferVisibility = { expenses: true, income: false }
    queryState.period = { period: 'custom', periodOffset: 0, customFrom: '2026-08-01', customTo: '2026-08-20' }

    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    const links = [...markup.matchAll(/<ion-router-link[^>]*aria-label="Транзакции категории Путешествия"[^>]*>/g)]
    expect(links).toHaveLength(2)
    links.forEach(([link], index) => {
      const href = link.match(/href="([^"]+)"/)![1].replace(/&amp;/g, '&')
      const url = new URL(href, 'http://localhost')
      expect(url.pathname).toBe('/transactions/filtered/1')
      expect(filterFromParams(url.searchParams)).toEqual({
        categoryIds: [`category-${index + 1}`],
        accountKinds: ['spending', 'deposit'],
        includeShared: true,
        includeTransferExpenses: true,
        includeTransferIncome: false,
      })
      expect(periodFromParams(url.searchParams, initialPeriod)).toEqual(queryState.period)
      expect(link).toContain('router-direction="forward"')
    })
    expect(markup).not.toContain('aria-label="Транзакции по счету')
  })

  it.each(['expenses', 'income'] as const)('preserves a shifted period and personal account scope in %s', (mode) => {
    queryState.chartMode = mode
    queryState.categoryStats = [{ categoryId: 'category-1', categoryName: 'Продукты', amount: 100 }]
    queryState.period = { ...initialPeriod, period: 'month', periodOffset: -2 }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    const href = markup.match(/href="([^"]*category_ids=category-1[^"]*)"/)![1].replace(/&amp;/g, '&')
    const params = new URL(href, 'http://localhost').searchParams
    expect(filterFromParams(params)).toEqual({ categoryIds: ['category-1'], accountKinds: ['spending'] })
    expect(periodFromParams(params, initialPeriod)).toEqual(queryState.period)
  })

  it.each(['expenses', 'income'] as const)('keeps synthetic %s groups without invalid category links', (mode) => {
    queryState.chartMode = mode
    queryState.categoryStats = [
            { categoryId: 'transfers', categoryName: 'Переводы', amount: 50 },
      { categoryId: 'transfers:bank', categoryName: 'Банк', amount: 20 },
    ]
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('Переводы')
    expect(markup).toContain('Банк')
    expect(markup).not.toContain('class="dashboard-chart-legend-link"')
    expect(markup).not.toContain('category_ids=')
  })
})


describe('Dashboard shared accounts', () => {
  it.each(['balance', 'expenses', 'income'] as const)('excludes shared accounts from every analytics request in %s', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(queryState.analyticsQueries).toHaveLength(3)
    for (const query of queryState.analyticsQueries) expect(query.params.account_ids).toBe('spending')
    expect(markup).not.toContain('dashboard-account-settings')
    expect(markup).not.toContain('Общий кошелёк')
    expect(markup).not.toContain('dashboard-account-filter__options')
  })

  it('includes shared accounts while keeping the kind filter', () => {
    queryState.includeShared = true
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    for (const query of queryState.analyticsQueries) expect(query.params.account_ids).toBe('spending,shared')
    expect(markup).toContain('Общий кошелёк')
    expect(markup).not.toContain('Общий вклад')
    expect(markup).not.toContain('Учитывать общие счета')
  })

  it.each(['onlyShared', 'accountsLoading', 'accountsError'] as const)('never requests all accounts when %s', (scenario) => {
    queryState[scenario] = true
    queryState.chartMode = 'expenses'
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(queryState.analyticsQueries.every((query) => !query.enabled)).toBe(true)
    expect(markup).toContain('Нет расходов за период')
    expect(markup).not.toContain('Расходы по тегам')
  })
})


it('queries every personal account kind when no account types are selected', () => {
  queryState.selectedKinds = []
  const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(markup).toContain('Все типы средств')
  expect(queryState.analyticsQueries.every((query) => query.enabled)).toBe(true)
  for (const query of queryState.analyticsQueries) {
    expect(query.params).toMatchObject({ account_kinds: 'all', account_ids: 'spending,deposit,savings' })
  }
  expect(queryState.transactionQueries[0]?.filter.accountIds).toEqual(['spending', 'deposit', 'savings'])
})

it.each([false, true])('shows all kinds selected and queries matching accounts, shared=%s', (includeShared) => {
  queryState.selectedKinds = ACCOUNT_KIND_OPTIONS.map((option) => option.value)
  queryState.includeShared = includeShared
  const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(markup).toContain('Все типы средств')
  const popover = queryState.popovers.find((props) => props.trigger === 'dashboard-kind-filter')!
  expect(renderToStaticMarkup(<>{popover.children}</>)).toMatch(/aria-label="Все типы средств" aria-pressed="true"/)
  const ids = includeShared
    ? ['spending', 'deposit', 'shared', 'shared-deposit', 'savings', 'shared-savings-account']
    : ['spending', 'deposit', 'savings']
  for (const query of queryState.analyticsQueries) {
    expect(query.params.account_ids).toBe(ids.join(','))
    expect(query.params.account_kinds).toBe(queryState.selectedKinds.join(','))
  }
  expect(queryState.transactionQueries[0]?.filter.accountIds).toEqual(ids)
})


it.each([false, true])('uses new kinds consistently in analytics, shared=%s', (includeShared) => {
  queryState.selectedKinds = ['savings', 'savings_account']
  queryState.includeShared = includeShared
  queryState.chartMode = 'expenses'
  renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const ids = includeShared ? ['savings', 'shared-savings-account'] : ['savings']
  for (const query of queryState.analyticsQueries) expect(query.params.account_ids).toBe(ids.join(','))
})


it('filters all matching accounts by kind without a specific-account selector', () => {
  queryState.selectedKinds = ['spending', 'savings_account']
  queryState.includeShared = true
  const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(markup).toContain('id="dashboard-kind-filter"')
  expect(markup).toContain('Типов средств: 2')
  expect(markup).not.toContain('dashboard-account-settings')
  expect(markup).not.toContain('Выбрано счетов:')
  expect(markup).not.toContain('ion-select-option value="spending"')
  for (const query of queryState.analyticsQueries) {
    expect(query.params.account_ids).toBe('spending,shared,shared-savings-account')
    expect(query.params.account_kinds).toBe('spending,savings_account')
  }
  expect(queryState.transactionQueries[0]?.filter.accountIds).toEqual(['spending', 'shared', 'shared-savings-account'])
})


it.each(['balance', 'expenses', 'income'] as const)('uses total amounts in %s without changing the selected accounts', (mode) => {
  queryState.amountMode = 'total'
  queryState.chartMode = mode
  queryState.includeShared = true
  queryState.selectedKinds = ['savings_account']
  const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  for (const query of queryState.analyticsQueries) expect(query.params).toMatchObject({
    amount_mode: 'total', account_ids: 'shared-savings-account',
  })
  expect(markup).not.toContain('Полные суммы')
  if (mode === 'balance') expect(markup).toContain('240')
  expect(queryState.transactionQueries[0]?.filter.accountIds).toEqual(['shared-savings-account'])
})
