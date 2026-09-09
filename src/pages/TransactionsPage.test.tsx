import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from './TransactionsPage'

vi.mock('@/lib/useChartTheme', () => ({
  useChartTheme: () => ({ tooltipStyle: {}, legendColor: 'black' }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false }),
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
    expect(markup).toContain('text="Назад"')
    expect(markup).toMatch(/<ion-buttons slot="start"><ion-back-button[^>]*><\/ion-back-button><\/ion-buttons>/)
    expect(markup).toMatch(/<ion-buttons slot="end"><ion-menu-button[^>]*aria-label="Главное меню"/)
  })

  it('keeps the main menu in the primary transaction list', () => {
    const markup = renderPage('/transactions')
    expect(markup).toContain('<ion-menu-button')
    expect(markup).not.toContain('<ion-back-button')
  })
})
