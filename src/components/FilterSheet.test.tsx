import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FilterSheet } from '@/components/FilterSheet'

const categoryFixture = vi.hoisted(() => ({ emptyType: '', onlyHidden: false }))
beforeEach(() => {
  categoryFixture.emptyType = ''
  categoryFixture.onlyHidden = false
})

vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonModal: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) => <div data-open={isOpen}>{children}</div>,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'categories' && queryKey[1] === categoryFixture.emptyType) return { data: [] }
    if (queryKey[0] === 'accounts') {
      return { data: [{
        id: 'account-1', name: 'Личная', icon: null, kind: 'spending', accessMode: 'personal',
      }, {
        id: 'account-shared', name: 'Общая', icon: null, kind: 'spending', accessMode: 'shared',
      }] }
    }
    if (queryKey[0] === 'categories' && queryKey[1] === 'expense') {
      return {
        data: [{
          id: 'category-1',
          name: 'Продукты',
          icon: 'preset:groceries',
          type: 'expense',
        }, { id: 'category-hidden', name: 'Архивная', icon: null, type: 'expense', hidden: true }].filter((category) => !categoryFixture.onlyHidden || category.hidden),
      }
    }
    if (queryKey[0] === 'categories' && queryKey[1] === 'income') {
      return { data: [
        { id: 'income-1', name: 'Зарплата', icon: null, type: 'income', hidden: false },
        { id: 'income-hidden', name: 'Старая работа', icon: null, type: 'income', hidden: true },
      ].filter((category) => !categoryFixture.onlyHidden || category.hidden) }
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
    expect(markup).toContain('Тип средств')
    expect(markup).toContain('Доступ к счёту')
    expect(markup).toContain('Личные')
    expect(markup).toContain('Общие')
    expect(markup).toContain('Все')
    expect(markup).not.toContain('Переводы в суммах')
    expect(markup).not.toContain('Учитывать в расходах')
    expect(markup).not.toContain('Учитывать в доходах')
    expect(markup).toContain('value="personal"')
  })
})

it('shows only shared concrete accounts for the shared account scope', () => {
  const markup = renderToStaticMarkup(
    <FilterSheet
      value={{ includeShared: true, onlyShared: true }}
      onChange={vi.fn()}
    />,
  )

  expect(markup).toContain('aria-label="Фильтры, активно: 1"')
  expect(markup).toContain('value="shared"')
  expect(markup).toContain('Общая')
  expect(markup).not.toContain('>Личная<')
})

it('does not count transfer display settings as filters', () => {
  const markup = renderToStaticMarkup(
    <FilterSheet
      value={{ includeTransferExpenses: true, includeTransferIncome: false }}
      onChange={vi.fn()}
    />,
  )

  expect(markup).toContain('aria-label="Фильтры"')
  expect(markup).not.toContain('Фильтры, активно:')
})

it('counts the summary transaction type selection as a filter', () => {
  const markup = renderToStaticMarkup(
    <FilterSheet value={{ types: ['expense', 'transfer'] }} onChange={vi.fn()} />,
  )

  expect(markup).toContain('aria-label="Фильтры, активно: 1"')
})

it('puts hidden categories and tags in separate closed disclosures', () => {
  const markup = renderToStaticMarkup(<FilterSheet value={{}} onChange={vi.fn()} />)
  const disclosures = markup.match(/<details[^>]*>.*?<\/details>/g) ?? []
  expect(disclosures).toHaveLength(3)
  expect(disclosures[0]).toContain('Скрытые категории (1)')
  expect(disclosures[0]).toContain('Архивная')
  expect(disclosures[1]).toContain('Скрытые категории (1)')
  expect(disclosures[1]).toContain('Старая работа')
  expect(disclosures[2]).toContain('Скрытые теги (1)')
  expect(disclosures[2]).toContain('#архив')
  expect(disclosures.join('')).not.toMatch(/<details[^>]* open/)
  const visibleMarkup = markup.replace(/<details[^>]*>.*?<\/details>/g, '')
  expect(visibleMarkup).toContain('Продукты')
  expect(visibleMarkup).toContain('Зарплата')
  expect(visibleMarkup).not.toContain('Старая работа')
  expect(visibleMarkup).toContain('#дом')
  expect(visibleMarkup).not.toContain('Архивная')
  expect(visibleMarkup).not.toContain('#архив')
})

it('separates expense and income options into labelled sections with a shared selection', () => {
  const markup = renderToStaticMarkup(<FilterSheet value={{ categoryIds: ['category-1', 'income-1', 'income-hidden'] }} onChange={vi.fn()} />)
  const expense = markup.match(/<section[^>]*aria-labelledby="filter-expense-categories-title".*?<\/section>/)?.[0] ?? ''
  const income = markup.match(/<section[^>]*aria-labelledby="filter-income-categories-title".*?<\/section>/)?.[0] ?? ''
  expect(expense).toContain('Категории расходов')
  expect(expense).toContain('Продукты')
  expect(expense).toContain('Архивная')
  expect(expense).not.toContain('Зарплата')
  expect(expense).not.toContain('Старая работа')
  expect(expense).not.toContain('выбрано:')
  expect(income).toContain('Категории доходов')
  expect(income).toContain('Зарплата')
  expect(income).toContain('Старая работа')
  expect(income).not.toContain('Продукты')
  expect(income).not.toContain('Архивная')
  expect(income).toContain('Скрытые категории (1) · выбрано: 1')
  expect(expense.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(income.match(/aria-pressed="true"/g)).toHaveLength(2)
  expect(markup).toContain('aria-label="Фильтры, активно: 1"')
})

it.each(['expense', 'income'])('omits an empty %s group', (type) => {
  categoryFixture.emptyType = type
  const markup = renderToStaticMarkup(<FilterSheet value={{}} onChange={vi.fn()} />)
  expect(markup).not.toContain(`filter-${type}-categories-title`)
  expect(markup).toContain(`filter-${type === 'expense' ? 'income' : 'expense'}-categories-title`)
})

it('keeps groups with only hidden categories available', () => {
  categoryFixture.onlyHidden = true
  const markup = renderToStaticMarkup(<FilterSheet value={{}} onChange={vi.fn()} />)
  expect(markup).toContain('Категории расходов')
  expect(markup).toContain('Категории доходов')
  expect(markup).toContain('Архивная')
  expect(markup).toContain('Старая работа')
  expect(markup).not.toContain('<span>Продукты</span>')
  expect(markup).not.toContain('<span>Зарплата</span>')
  expect(markup).not.toMatch(/<details[^>]* open/)
})

it('announces selected hidden filters without expanding their lists', () => {
  const markup = renderToStaticMarkup(<FilterSheet value={{ categoryIds: ['category-hidden'], tagIds: ['tag-hidden'] }} onChange={vi.fn()} />)
  expect(markup).toContain('Скрытые категории (1) · выбрано: 1')
  expect(markup).toContain('Скрытые теги (1) · выбрано: 1')
  expect(markup).not.toMatch(/<details[^>]* open/)
})


it.each([true, false])('supports externally controlled open state: %s', (isOpen) => {
  const markup = renderToStaticMarkup(
    <FilterSheet value={{ accountIds: ['account-1'], tagIds: ['tag-1'] }}
      onChange={vi.fn()} isOpen={isOpen} onOpenChange={vi.fn()} />,
  )
  expect(markup).toContain(`data-open="${isOpen}"`)
  expect(markup).toContain('aria-label="Фильтры, активно: 2"')
  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(3)
})
