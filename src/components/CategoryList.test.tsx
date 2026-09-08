import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Category } from '@/api/categories'
import { CategoryList } from './CategoryList'

const categories: Category[] = ['Продукты', 'Кофейни'].map((name, index) => ({
  id: String(index),
  userId: 'user',
  name,
  type: 'expense',
  icon: 'preset:groceries',
  createdAt: '2026-09-08T00:00:00Z',
}))

describe('CategoryList', () => {
  it('renders all categories with edit and delete actions', () => {
    const markup = renderToStaticMarkup(
      <CategoryList categories={categories} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(markup.match(/<ion-item>/g)).toHaveLength(2)
    expect(markup.match(/<ion-button /g)).toHaveLength(4)
    for (const category of categories) {
      expect(markup).toContain(`Редактировать «${category.name}»`)
      expect(markup).toContain(`Удалить «${category.name}»`)
    }
  })

  it('renders no rows for an empty list', () => {
    expect(renderToStaticMarkup(
      <CategoryList categories={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )).toBe('')
  })
})

it('offers personal hiding and restoring while retaining edit and delete', () => {
  const markup = renderToStaticMarkup(<CategoryList categories={[{ ...categories[0], hidden: true }]} onEdit={vi.fn()} onDelete={vi.fn()} onToggleHidden={vi.fn()} />)
  expect(markup).toContain('Скрыта для меня')
  expect(markup).toContain('Показать «Продукты»')
  expect(markup).toContain('Редактировать «Продукты»')
})
