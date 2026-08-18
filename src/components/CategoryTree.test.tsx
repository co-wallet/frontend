import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CategoryNode } from '@/api/categories'
import { CategoryTree } from './CategoryTree'

const child: CategoryNode = {
  id: 'child',
  userId: 'user',
  parentId: 'parent',
  name: 'Пиво',
  type: 'expense',
  icon: 'preset:drinks',
  createdAt: '2026-08-18T00:00:00Z',
  children: [],
}

const parent: CategoryNode = {
  id: 'parent',
  userId: 'user',
  parentId: null,
  name: 'Продукты',
  type: 'expense',
  icon: 'preset:groceries',
  createdAt: '2026-08-18T00:00:00Z',
  children: [child],
}

const leaf: CategoryNode = {
  ...child,
  id: 'leaf',
  parentId: null,
  name: 'Кофейни',
  icon: 'preset:cafe',
}

describe('CategoryTree', () => {
  it('keeps equal-depth icons aligned and renders only one expand control', () => {
    const markup = renderToStaticMarkup(
      <CategoryTree
        nodes={[leaf, parent]}
        expanded={new Set(['parent'])}
        onToggle={vi.fn()}
        onAddChild={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(markup.match(/--padding-start:8px/g)).toHaveLength(2)
    expect(markup).toContain('--padding-start:32px')
    expect(markup.match(/aria-label="Свернуть «Продукты»"/g)).toHaveLength(1)
    expect(markup).not.toContain('detail="true"')
  })

  it('exposes visible add, edit, and delete actions for every category', () => {
    const markup = renderToStaticMarkup(
      <CategoryTree
        nodes={[parent]}
        expanded={new Set()}
        onToggle={vi.fn()}
        onAddChild={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(markup).toContain('Добавить подкатегорию к «Продукты»')
    expect(markup).toContain('Редактировать «Продукты»')
    expect(markup).toContain('Удалить «Продукты»')
  })
})
