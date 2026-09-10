import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import type { TransactionPeriod } from '@/lib/transactionNavigation'

vi.mock('@/lib/useChartTheme', () => ({ useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }) }))

const queryState = vi.hoisted(() => ({
  selectedKinds: ['spending'] as string[],
  includeShared: false,
  accountFilter: 'all',
  selectedIds: [] as string[],
  accountsLoading: false,
  accountsError: false,
  onlyShared: false,
  analyticsQueries: [] as { params: Record<string, unknown>; enabled: boolean }[],
  chartMode: 'balance' as 'balance' | 'expenses' | 'income',
  transferVisibility: { expenses: false, income: true },
  period: { period: 'month', periodOffset: 0, customFrom: '2026-01-01', customTo: '2026-01-10' } as TransactionPeriod,
}))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(Array.isArray(initial) && initial[0] === 'spending' ? queryState.selectedKinds : initial === false ? queryState.includeShared : initial === 'all' ? queryState.accountFilter : Array.isArray(initial) && initial.length === 0 ? queryState.selectedIds : initial === 'balance' ? queryState.chartMode : (typeof initial === 'object' && initial !== null && 'expenses' in initial && 'income' in initial) ? queryState.transferVisibility : initial),
  }
})
vi.mock('@/store/periodStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/store/periodStore')>(),
  usePeriodStore: () => ({ ...queryState.period, setPeriod: vi.fn(), setPeriodOffset: vi.fn(), setCustomFrom: vi.fn(), setCustomTo: vi.fn() }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
    if (queryKey[0] === 'analytics') queryState.analyticsQueries.push({ params: queryKey[queryKey.length - 1] as Record<string, unknown>, enabled: Boolean(enabled) })
    if (queryKey[0] === 'accounts') return { isLoading: queryState.accountsLoading, isError: queryState.accountsError, data: [
      { id: 'spending', name: 'Личная', kind: 'spending', accessMode: 'personal', currency: 'USD', balance: { display: 10 } },
      { id: 'deposit', name: 'Вклад', kind: 'deposit', accessMode: 'personal', currency: 'USD', balance: { display: 10 } },
      { id: 'shared', name: 'Общий кошелёк', kind: 'spending', accessMode: 'shared', currency: 'USD', balance: { display: 30 } },
      { id: 'shared-deposit', name: 'Общий вклад', kind: 'deposit', accessMode: 'shared', currency: 'USD', balance: { display: 40 } },
      { id: 'savings', name: 'Резерв', kind: 'savings', accessMode: 'personal', currency: 'USD', balance: { display: 50 } },
      { id: 'shared-savings-account', name: 'Общий накопительный', kind: 'savings_account', accessMode: 'shared', currency: 'USD', balance: { display: 60, totalDisplay: 240 } },
    ].filter((account) => !queryState.onlyShared || account.accessMode === 'shared') }
    if (queryKey[1] === 'by-category') return { data: [
      { categoryId: 'transfers:bank', categoryName: queryKey[2] === 'expense' ? "В 'Банк'" : "Из 'Банк'", amount: 50 },
    ] }
    if (queryKey[1] === 'summary') return { data: { balance: 10, expenses: 10, income: 0 } }
    return { data: [] }
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn() }),
}))
const initialPeriod = { ...queryState.period }
afterEach(() => { queryState.selectedKinds = ['spending']; queryState.includeShared = false; queryState.accountFilter = 'all'; queryState.selectedIds = []; queryState.accountsLoading = false; queryState.accountsError = false; queryState.onlyShared = false; queryState.analyticsQueries = []; queryState.period = initialPeriod; queryState.chartMode = 'balance'; queryState.transferVisibility = { expenses: false, income: true } })


describe('Dashboard period visibility', () => {
  it('hides period controls in the initial balance view', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('Баланс по счетам')
    expect(markup).not.toContain('Предыдущий период')
    expect(markup).not.toContain('Период доходов и расходов')
  })

  it.each(['expenses', 'income'] as const)('places period controls below summary cards in %s mode', (mode) => {
    queryState.chartMode = mode
    queryState.period = { period: 'custom', periodOffset: 0, customFrom: '2026-08-01', customTo: '2026-08-20' }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toMatch(/Доходы[^]*<section[^>]*aria-label="Период доходов и расходов"[^>]*>[^]*Предыдущий период[^]*Другой период[^]*<\/section>[^]*(Расходы|Доходы) по категориям/)
    expect(markup).toContain('Выбранный период: 01.08.26 - 20.08.26')
    expect(queryState.analyticsQueries[queryState.analyticsQueries.length - 1]?.params).toMatchObject({ date_from: '2026-08-01', date_to: '2026-08-20' })
  })
})


describe('Dashboard transfer visibility', () => {
  it.each(['expenses', 'income'] as const)('shows the independent default for %s', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain(mode === 'expenses' ? 'aria-label="Настройки расходов"' : 'aria-label="Настройки доходов"')
    expect(markup).toContain('id="dashboard-chart-settings"')
    expect(markup).toContain('aria-haspopup="dialog"')
    expect(markup).not.toContain('Отображать переводы')
    expect(markup).not.toContain('dashboard-transfer-hint')
    const periodControls = markup.match(/<section[^>]*aria-label="Период доходов и расходов"[^>]*>[^]*?<\/section>/)?.[0]
    expect(periodControls).not.toContain('ion-checkbox')
    const chartHeader = markup.match(/<ion-card-header[^>]*>[^]*?(Расходы|Доходы) по категориям[^]*?<\/ion-card-header>/)?.[0]
    expect(chartHeader).toContain('id="dashboard-chart-settings"')
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
  })

  it.each(['expenses', 'income'] as const)('omits recent transactions in %s mode', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).not.toContain('Последние транзакции')
    expect(markup).not.toContain('Все транзакции')
    expect(markup).toContain(mode === 'expenses' ? 'Расходы по категориям' : 'Доходы по категориям')
  })
})


describe('Dashboard shared accounts', () => {
  it.each(['balance', 'expenses', 'income'] as const)('excludes shared accounts from every analytics request in %s', (mode) => {
    queryState.chartMode = mode
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(queryState.analyticsQueries).toHaveLength(3)
    for (const query of queryState.analyticsQueries) expect(query.params.account_ids).toBe('spending')
    expect(markup).toContain('Личные счета')
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

  it.each([false, true])('intersects custom selection with shared visibility %s', (includeShared) => {
    queryState.includeShared = includeShared
    queryState.accountFilter = 'custom'
    queryState.selectedIds = ['spending', 'shared', 'shared-deposit', 'deleted']
    renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    for (const query of queryState.analyticsQueries) expect(query.params.account_ids).toBe(includeShared ? 'spending,shared' : 'spending')
  })

  it.each(['onlyShared', 'accountsLoading', 'accountsError', 'emptyCustom'] as const)('never requests all accounts when %s', (scenario) => {
    if (scenario === 'emptyCustom') queryState.accountFilter = 'custom'
    else queryState[scenario] = true
    queryState.chartMode = 'expenses'
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(queryState.analyticsQueries.every((query) => !query.enabled)).toBe(true)
    expect(markup).toContain('Нет расходов за период')
    expect(markup).not.toContain('Расходы по тегам')
  })
})


it('shows zero totals without querying analytics when no account types are selected', () => {
  queryState.selectedKinds = []
  const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(markup).toContain('Типы не выбраны')
  expect(markup).toContain('Нет данных о балансе')
  expect(queryState.analyticsQueries.every((query) => !query.enabled)).toBe(true)
})


it.each([false, true])('uses new kinds consistently in analytics, shared=%s', (includeShared) => {
  queryState.selectedKinds = ['savings', 'savings_account']
  queryState.includeShared = includeShared
  queryState.chartMode = 'expenses'
  renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const ids = includeShared ? ['savings', 'shared-savings-account'] : ['savings']
  for (const query of queryState.analyticsQueries) expect(query.params.account_ids).toBe(ids.join(','))
})
