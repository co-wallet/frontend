import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeDateRange } from '@/store/periodStore'
import { DashboardPage } from './DashboardPage'
import { filterFromParams, periodFromParams, type TransactionPeriod } from '@/lib/transactionNavigation'

vi.mock('@/lib/useChartTheme', () => ({ useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }) }))

const queryState = vi.hoisted(() => ({
  chartMode: 'balance' as 'balance' | 'expenses' | 'income',
  transferVisibility: { expenses: false, income: true },
  params: [] as Record<string, unknown>[],
  period: { period: 'month', periodOffset: 0, customFrom: '2026-01-01', customTo: '2026-01-10' } as TransactionPeriod,
}))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(initial === 'balance' ? queryState.chartMode : (typeof initial === 'object' && initial !== null && 'expenses' in initial && 'income' in initial) ? queryState.transferVisibility : initial),
  }
})
vi.mock('@/store/periodStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/store/periodStore')>(),
  usePeriodStore: () => ({ ...queryState.period, setPeriod: vi.fn(), setPeriodOffset: vi.fn(), setCustomFrom: vi.fn(), setCustomTo: vi.fn() }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'accounts') return { data: [
      { id: 'spending', name: 'Личная', kind: 'spending', currency: 'USD', balance: { display: 10 } },
      { id: 'deposit', name: 'Вклад', kind: 'deposit', currency: 'USD', balance: { display: 10 } },
    ] }
    if (queryKey[1] === 'by-tag') {
      queryState.params.push(queryKey[2] as Record<string, unknown>)
      return { data: [{ tagId: 'travel', tagName: 'Поездка', amount: 10 }] }
    }
    if (queryKey[1] === 'by-category') return { data: [
      { categoryId: 'transfers:bank', categoryName: queryKey[2] === 'expense' ? "В 'Банк'" : "Из 'Банк'", amount: 50 },
    ] }
    if (queryKey[1] === 'summary') return { data: { balance: 10, expenses: 10, income: 0 } }
    return { data: [] }
  },
  useMutation: () => ({ mutate: vi.fn() }),
}))
const initialPeriod = { ...queryState.period }
afterEach(() => { queryState.period = initialPeriod; queryState.params = []; queryState.chartMode = 'balance'; queryState.transferVisibility = { expenses: false, income: true } })

describe('Dashboard tag navigation', () => {
  it.each([
    { period: 'month' as const, periodOffset: -1, customFrom: '2026-08-01', customTo: '2026-08-20' },
    { period: 'custom' as const, periodOffset: 0, customFrom: '2026-08-01', customTo: '2026-08-20' },
  ])('links to the tag using the same period as the dashboard: $period', (source) => {
    queryState.period = source
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    const header = markup.match(/<ion-header>([^]*?)<\/ion-header>/)?.[1]
    expect(header).toContain('Главное меню')
    expect(header).not.toContain('Валюта')
    expect(header).not.toContain('Выйти')
    expect(header).not.toContain('ion-back-button')
    expect(markup).toMatch(/<section[^>]*aria-label="Параметры отображения"[^>]*>[^]*Текущие средства[^]*aria-label="Валюта"[^]*<\/section>/)
    expect(markup).not.toContain('label="Валюта" label-placement="stacked"')
    expect(markup).toMatch(/Текущие средства[^]*<ion-select[^>]*aria-label="Валюта"[^>]*selected-text=/)
    const href = markup.match(/href="([^"]*\/transactions\/filtered\/1[^"]*)"/)?.[1].replace(/&amp;/g, '&')
    expect(href).toBeDefined()
    const params = new URL(href!, 'http://localhost').searchParams
    expect(filterFromParams(params)).toEqual({ accountIds: ['spending'], tagIds: ['travel'] })
    expect(periodFromParams(params, initialPeriod)).toEqual(source)
    const range = computeDateRange(source.period, source.periodOffset, source.customFrom, source.customTo)
    expect(queryState.params[queryState.params.length - 1]).toMatchObject({ date_from: range.dateFrom, date_to: range.dateTo })
  })
})


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
    expect(queryState.params[queryState.params.length - 1]).toMatchObject({ date_from: '2026-08-01', date_to: '2026-08-20' })
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
    expect(queryState.params[queryState.params.length - 1]).toMatchObject({ include_transfer_expenses: false, include_transfer_income: true })
  })

  it('uses both changed preferences in analytics queries', () => {
    queryState.chartMode = 'expenses'
    queryState.transferVisibility = { expenses: true, income: false }
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).toContain('aria-label="Настройки расходов"')
    expect(queryState.params[queryState.params.length - 1]).toMatchObject({ include_transfer_expenses: true, include_transfer_income: false })
  })

  it('hides the transfer control for balance', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(markup).not.toContain('Отображать переводы')
    expect(markup).not.toContain('dashboard-chart-settings')
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
