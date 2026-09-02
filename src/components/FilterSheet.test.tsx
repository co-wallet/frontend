import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FilterSheet } from '@/components/FilterSheet'

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'accounts') {
      return { data: [{ id: 'account-1', name: 'Личная', icon: null }] }
    }
    if (queryKey[0] === 'categories' && queryKey[1] === 'expense') {
      return {
        data: [{
          id: 'category-1',
          name: 'Продукты',
          icon: 'preset:groceries',
          type: 'expense',
          children: [],
        }],
      }
    }
    if (queryKey[0] === 'tags') {
      return { data: [{ id: 'tag-1', name: 'дом' }] }
    }
    return { data: [] }
  },
}))

describe('FilterSheet', () => {
  it('keeps dates in the period control and announces the active filter count', () => {
    const markup = renderToStaticMarkup(
      <FilterSheet
        value={{
          accountIds: ['account-1'],
          categoryIds: ['category-1'],
          tagIds: ['tag-1'],
          tagMode: 'and',
        }}
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('aria-label="Фильтры, активно: 3"')
    expect(markup).toContain('slot="icon-only"')
    expect(markup).not.toContain('filter-sheet-trigger__label')
    expect(markup).not.toContain('Период с')
    expect(markup).not.toContain('Период по')
  })
})
