import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { TagInput, TagSuggestionList } from './TagInput'

describe('TagInput', () => {
  it('renders selected tags and the search control', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <TagInput value={['семья', 'отпуск']} onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(markup).toContain('#семья')
    expect(markup).toContain('#отпуск')
    expect(markup).toContain('placeholder="Добавить тег..."')
  })
})

describe('TagSuggestionList', () => {
  it('renders every provided suggestion in an in-flow list', () => {
    const suggestions = Array.from({ length: 6 }, (_, index) => ({
      id: `tag-${index}`,
      name: `тег-${index}`,
      txCount: index,
    }))

    const markup = renderToStaticMarkup(
      <TagSuggestionList suggestions={suggestions} onSelect={vi.fn()} />,
    )

    expect(markup).toContain('aria-label="Подсказки тегов"')
    expect(markup).toContain('class="tag-input__suggestions')
    expect(markup).not.toContain('position:absolute')
    for (const suggestion of suggestions) {
      expect(markup).toContain(`#${suggestion.name}`)
    }
  })
})
