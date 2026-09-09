import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeDateRange } from '@/store/periodStore'
import { DashboardPage } from './DashboardPage'
import { filterFromParams, periodFromParams, type TransactionPeriod } from '@/lib/transactionNavigation'

vi.mock('@/lib/useChartTheme', () => ({ useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }) }))

const queryState = vi.hoisted(() => ({
  params: [] as Record<string, unknown>[],
  period: { period: 'month', periodOffset: 0, customFrom: '2026-01-01', customTo: '2026-01-10' } as TransactionPeriod,
}))
vi.mock('@/store/periodStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/store/periodStore')>(),
  usePeriodStore: () => ({ ...queryState.period, setPeriod: vi.fn(), setCustomFrom: vi.fn(), setCustomTo: vi.fn() }),
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
    if (queryKey[1] === 'summary') return { data: { balance: 10, expenses: 10, income: 0 } }
    return { data: [] }
  },
  useMutation: () => ({ mutate: vi.fn() }),
}))
const initialPeriod = { ...queryState.period }
afterEach(() => { queryState.period = initialPeriod; queryState.params = [] })

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
    expect(markup).toMatch(/<section[^>]*aria-label="Параметры отображения"[^>]*>[^]*aria-label="Период"[^]*aria-label="Валюта"[^]*Текущие средства[^]*<\/section>/)
    const href = markup.match(/href="([^"]*\/transactions\/filtered\/1[^"]*)"/)?.[1].replace(/&amp;/g, '&')
    expect(href).toBeDefined()
    const params = new URL(href!, 'http://localhost').searchParams
    expect(filterFromParams(params)).toEqual({ accountIds: ['spending'], tagIds: ['travel'] })
    expect(periodFromParams(params, initialPeriod)).toEqual(source)
    const range = computeDateRange(source.period, source.periodOffset, source.customFrom, source.customTo)
    expect(queryState.params[queryState.params.length - 1]).toMatchObject({ date_from: range.dateFrom, date_to: range.dateTo })
  })
})
