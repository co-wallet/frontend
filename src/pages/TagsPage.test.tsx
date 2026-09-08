import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type Tag } from '@/api/tags'
import { TagsPage } from './TagsPage'

const queryState = vi.hoisted(() => ({ tags: [] as Tag[] }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: queryState.tags, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('TagsPage', () => {
  beforeEach(() => {
    queryState.tags = []
  })

  it('links each tag to transactions filtered by its ID, including unused tags', () => {
    queryState.tags = [
      { id: 'tag-1', name: 'Отпуск', txCount: 4 },
      { id: 'tag-2', name: 'Покупки', txCount: 0 },
    ]

    const markup = renderToStaticMarkup(<TagsPage />)

    expect(markup).toContain('href="/transactions?tag_ids=tag-1"')
    expect(markup).toContain('href="/transactions?tag_ids=tag-2"')
    expect(markup).toContain('Операции (4)')
    expect(markup).toContain('Операции (0)')
    expect(markup).not.toContain('ion-item-sliding')
    expect(markup).not.toMatch(/<ion-item[^>]*href=/)
    expect(markup).toContain('aria-label="Редактировать тег Отпуск"')
    expect(markup).toContain('aria-label="Скрыть тег Отпуск"')
    expect(markup).toContain('aria-label="Удалить тег Отпуск"')
    expect(markup).toContain('aria-label="Операции с тегом Отпуск"')
  })

  it('encodes the tag ID so it cannot introduce additional filters', () => {
    queryState.tags = [{ id: 'tag&account_ids=other', name: 'Тег' }]

    const markup = renderToStaticMarkup(<TagsPage />)

    expect(markup).toContain('href="/transactions?tag_ids=tag%26account_ids%3Dother"')
  })

  it('shows the empty state without transaction links when there are no tags', () => {
    const markup = renderToStaticMarkup(<TagsPage />)

    expect(markup).toContain('Нет тегов. Добавьте теги к транзакциям.')
    expect(markup).not.toContain('/transactions?')
  })
})

it('omits hidden tags by default and offers a reveal button even when all are hidden', () => {
  queryState.tags = [{ id: 'hidden-tag', name: 'отпуск', hidden: true }]
  const markup = renderToStaticMarkup(<TagsPage />)
  expect(markup).not.toContain('/transactions?tag_ids=hidden-tag')
  expect(markup).not.toContain('Редактировать тег отпуск')
  expect(markup).toContain('Показать скрытые теги (1)')
  expect(markup).toContain('aria-expanded="false"')
  expect(markup).toContain('Все теги скрыты')
})

it('does not offer reveal when the catalog has no hidden entries', () => {
  queryState.tags = [{ id: 'visible-tag', name: 'отпуск' }]
  const markup = renderToStaticMarkup(<TagsPage />)
  expect(markup).not.toContain('Показать скрытые теги')
})
