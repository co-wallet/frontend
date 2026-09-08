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

    expect(markup).toMatch(/<ion-item[^>]*href="\/transactions\?tag_ids=tag-1"[^>]*>.*?#Отпуск/)
    expect(markup).toMatch(/<ion-item[^>]*href="\/transactions\?tag_ids=tag-2"[^>]*>.*?#Покупки/)
    expect(markup).toContain('4 транз.')
    expect(markup).toContain('0 транз.')
    expect(markup.match(/<ion-item-option /g)).toHaveLength(6)
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

it('keeps hidden tags accessible through history links and offers to show them', () => {
  queryState.tags = [{ id: 'hidden-tag', name: 'отпуск', hidden: true }]
  const markup = renderToStaticMarkup(<TagsPage />)
  expect(markup).toContain('/transactions?tag_ids=hidden-tag')
  expect(markup).toContain('Скрыт для меня')
  expect(markup).toContain('Показать тег отпуск')
  expect(markup).toContain('Добавить тег')
})
