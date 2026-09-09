import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from './TransactionsPage'

vi.mock('@/lib/useChartTheme', () => ({
  useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'accounts'
      ? [{ id: 'a1', name: 'Личная' }, { id: 'a2', name: 'Кредитный' }, { id: 'a3', name: 'Инвестиции' }]
      : queryKey[0] === 'categories' && queryKey[1] === 'expense'
        ? [{ id: 'c1', name: 'Продукты' }, { id: 'c2', name: 'Кафе' }]
        : queryKey[0] === 'tags'
          ? [{ id: 't1', name: 'путешествия' }, { id: 't2', name: 'япония' }]
          : [],
    isLoading: false,
  }),
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
})


describe('active filter summary', () => {
  it('shows a clear unfiltered state without empty groups', () => {
    const markup = renderPage('/transactions')
    expect(markup).toContain('все счета, категории и теги')
    expect(markup).not.toContain('class="transactions-filter-group"')
    expect(markup).not.toContain('Сбросить все')
  })

  it('shows one value per type with independent overflow counts', () => {
    const markup = renderPage('/transactions?account_ids=a1,a2,a3&category_ids=c1,c2&tag_ids=t1,t2&tag_mode=and')
    expect(markup).toContain('aria-label="Счета:')
    expect(markup).toContain('aria-label="Категории:')
    expect(markup).toContain('aria-label="Теги:')
    expect(markup.match(/\. Открыть фильтры"/g)).toHaveLength(3)
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

  it('omits empty types and overflow for a single selected value', () => {
    const markup = renderPage('/transactions?tag_ids=t1')
    expect(markup).toContain('aria-label="Теги:')
    expect(markup).not.toContain('aria-label="Счета:')
    expect(markup).not.toContain('aria-label="Категории:')
    expect(markup).not.toContain('Ещё')
    expect(markup).toContain('aria-label="Теги: #путешествия. Открыть фильтры"')
    expect(markup).toContain('title="Теги: #путешествия"')
  })

  it('keeps unknown selections visible and counted while dictionaries are unavailable', () => {
    const markup = renderPage('/transactions?account_ids=unknown,other&category_ids=missing&tag_ids=unavailable')
    expect(markup).toContain('aria-label="Счета: Счёт, ещё 1. Открыть фильтры"')
    expect(markup).toContain('aria-label="Категории: Категория. Открыть фильтры"')
    expect(markup).toContain('#Тег')
    expect(markup).toContain('Счета: Счёт, ещё 1. Открыть фильтры')
  })
})
