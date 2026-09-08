import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FilterSheet } from '@/components/FilterSheet'

vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

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
        }, { id: 'category-hidden', name: 'Архивная', icon: null, type: 'expense', hidden: true }],
      }
    }
    if (queryKey[0] === 'tags') {
      return { data: [{ id: 'tag-1', name: 'дом' }, { id: 'tag-hidden', name: 'архив', hidden: true }] }
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

it('puts hidden categories and tags in separate closed disclosures', () => {
  const markup = renderToStaticMarkup(<FilterSheet value={{}} onChange={vi.fn()} />)
  const disclosures = markup.match(/<details[^>]*>.*?<\/details>/g) ?? []
  expect(disclosures).toHaveLength(2)
  expect(disclosures[0]).toContain('Скрытые категории (1)')
  expect(disclosures[0]).toContain('Архивная')
  expect(disclosures[1]).toContain('Скрытые теги (1)')
  expect(disclosures[1]).toContain('#архив')
  expect(disclosures.join('')).not.toMatch(/<details[^>]* open/)
  const visibleMarkup = markup.replace(/<details[^>]*>.*?<\/details>/g, '')
  expect(visibleMarkup).toContain('Продукты')
  expect(visibleMarkup).toContain('#дом')
  expect(visibleMarkup).not.toContain('Архивная')
  expect(visibleMarkup).not.toContain('#архив')
})

it('announces selected hidden filters without expanding their lists', () => {
  const markup = renderToStaticMarkup(<FilterSheet value={{ categoryIds: ['category-hidden'], tagIds: ['tag-hidden'] }} onChange={vi.fn()} />)
  expect(markup).toContain('Скрытые категории (1) · выбрано: 1')
  expect(markup).toContain('Скрытые теги (1) · выбрано: 1')
  expect(markup).not.toMatch(/<details[^>]* open/)
})
