import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/api/categories'
import CategoriesPage from './CategoriesPage'

const state = vi.hoisted(() => ({ categories: [] as Category[] }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: state.categories, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

const visible: Category = { id: 'food', userId: 'u1', name: 'Еда', type: 'expense', icon: null, createdAt: '' }
const hidden: Category = { ...visible, id: 'hidden', name: 'Архивная', hidden: true }

describe('CategoriesPage visibility', () => {
  it('shows visible categories and a collapsed reveal button', () => {
    state.categories = [visible, hidden]
    const markup = renderToStaticMarkup(<CategoriesPage />)
    expect(markup).toContain('Редактировать «Еда»')
    expect(markup).not.toContain('Архивная')
    expect(markup).toContain('Показать скрытые категории (1)')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('keeps a way to reveal the catalog when every category is hidden', () => {
    state.categories = [hidden]
    const markup = renderToStaticMarkup(<CategoriesPage />)
    expect(markup).toContain('Все категории скрыты')
    expect(markup).toContain('Показать скрытые категории (1)')
  })

  it('omits the reveal button when there are no hidden categories', () => {
    state.categories = [visible]
    expect(renderToStaticMarkup(<CategoriesPage />)).not.toContain('Показать скрытые категории')
  })
})
