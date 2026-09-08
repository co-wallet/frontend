import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Category } from '@/api/categories'
import { CategorySelect } from '@/components/CategorySelect'

const categories: Category[] = [{
  id: 'category-cafe',
  userId: 'user-1',
  name: 'Кофейни',
  type: 'expense',
  icon: 'preset:cafe|orange|none',
  createdAt: '2026-09-08T00:00:00Z',
}]

describe('CategorySelect', () => {
  it('renders the selected category with its stored icon appearance', () => {
    const markup = renderToStaticMarkup(
      <CategorySelect
        categories={categories}
        type="expense"
        value="category-cafe"
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('aria-label="Категория: Кофейни"')
    expect(markup).toContain('<h2>Кофейни</h2>')
    expect(markup).toContain('--account-icon-foreground:var(--account-icon-color-orange)')
  })

  it('shows the shared uncategorized icon when no category is selected', () => {
    const markup = renderToStaticMarkup(
      <CategorySelect
        categories={categories}
        type="expense"
        value=""
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('aria-label="Категория: Без категории"')
    expect(markup).toContain('<h2>Без категории</h2>')
    expect(markup).toContain('--account-icon-foreground:var(--account-icon-color-red)')
  })
})
