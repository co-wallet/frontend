import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FilterSheet } from './FilterSheet'
import type { FilterMultiSelect } from './FilterMultiSelect'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  fields: new Map<string, ComponentProps<typeof FilterMultiSelect>>(),
  buttons: new Map<string, () => void>(),
}))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = controls.cursor++
    if (!(index in controls.state)) controls.state[index] = initial
    return [controls.state[index], (next: unknown) => {
      controls.state[index] = typeof next === 'function' ? next(controls.state[index]) : next
    }]
  },
}))
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonModal: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) => <div data-open={isOpen}>{children}</div>,
    IonButton: ({ children, onClick, ...props }: ComponentProps<typeof actual.IonButton>) => {
      controls.buttons.set(props['aria-label'] ?? String(children), () => onClick?.({} as Parameters<NonNullable<typeof onClick>>[0]))
      return <actual.IonButton {...props}>{children}</actual.IonButton>
    },
  }
})
vi.mock('./FilterMultiSelect', () => ({
  FilterMultiSelect: (props: ComponentProps<typeof FilterMultiSelect>) => {
    controls.fields.set(props.label, props)
    return <div data-field={props.label}>{props.label}</div>
  },
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data:
    queryKey[0] === 'accounts' ? [
      { id: 'personal', name: 'Личная', kind: 'spending', accessMode: 'personal' },
      { id: 'shared', name: 'Общая', kind: 'spending', accessMode: 'shared' },
      { id: 'deposit', name: 'Вклад', kind: 'deposit', accessMode: 'personal' },
    ] : queryKey[0] === 'categories' ? [
      { id: queryKey[1], name: queryKey[1], type: queryKey[1] },
      { id: `${queryKey[1]}-hidden`, name: 'Архив', type: queryKey[1], hidden: true },
    ] : [{ id: 'tag', name: 'дом' }, { id: 'tag-hidden', name: 'архив', hidden: true }],
  }),
}))

function render(props: Partial<ComponentProps<typeof FilterSheet>> = {}) {
  controls.cursor = 0
  controls.fields.clear()
  controls.buttons.clear()
  return renderToStaticMarkup(<FilterSheet value={{}} onChange={vi.fn()} {...props} />)
}
beforeEach(() => { controls.state = [] })
const field = (label: string) => controls.fields.get(label)!

describe('FilterSheet multiselects', () => {
  it('shows seven uniform fields with a single-select tag matching rule', () => {
    const markup = render()
    expect([...controls.fields.keys()]).toEqual([
      'Тип средств', 'Доступ к счёту', 'Конкретные счета', 'Категории расходов', 'Категории доходов', 'Теги', 'Совпадение тегов',
    ])
    expect(markup).toContain('Совпадение тегов')
    expect(field('Тип средств').selectedIds).toEqual(['spending'])
    expect(field('Доступ к счёту').selectedIds).toEqual(['personal'])
    for (const name of ['Конкретные счета', 'Категории расходов', 'Категории доходов', 'Теги']) {
      expect(field(name).searchLabel).toBeTruthy()
    }
    expect(field('Тип средств').searchLabel).toBeUndefined()
    expect(field('Совпадение тегов').singleSelect).toBe(true)
    expect(field('Совпадение тегов').selectedIds).toEqual(['or'])
  })

  it('applies the selected tag matching rule and resets it to Any', () => {
    const onChange = vi.fn()
    const props = { value: { tagIds: ['tag'] }, onChange }
    render(props)
    field('Совпадение тегов').onChange(['and'])
    render(props)
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ accountKinds: ['spending'], tagIds: ['tag'], tagMode: 'and' })
    field('Совпадение тегов').onChange(['or'])
    render(props)
    expect(field('Совпадение тегов').selectedIds).toEqual(['or'])
  })

  it('provides hidden categories and tags to the pickers', () => {
    render()
    expect(field('Категории расходов').options).toContainEqual(expect.objectContaining({ id: 'expense-hidden', hidden: true }))
    expect(field('Теги').options).toContainEqual(expect.objectContaining({ id: 'tag-hidden', hidden: true }))
  })

  it('keeps category selections independent when selecting or clearing an entire group', () => {
    const onChange = vi.fn()
    const props = { value: { categoryIds: ['expense', 'income', 'income-hidden'] }, onChange }
    render(props)
    field('Категории расходов').onChange(['expense', 'expense-hidden'])
    render(props)
    expect(field('Категории доходов').selectedIds).toEqual(['income', 'income-hidden'])
    field('Категории доходов').onChange([])
    render(props)
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ accountKinds: ['spending'], categoryIds: ['expense', 'expense-hidden'] })
  })

  it('applies all kinds, concrete accounts and tags while preserving transaction settings', () => {
    const onChange = vi.fn()
    const props = { value: { types: ['expense' as const], includeTransferExpenses: true, includeTransferIncome: false, tagMode: 'and' as const }, onChange }
    render(props)
    const kinds = ACCOUNT_KIND_OPTIONS.map((option) => option.value)
    field('Тип средств').onChange(kinds)
    field('Доступ к счёту').onChange(['personal', 'shared'])
    field('Конкретные счета').onChange(['personal', 'shared'])
    field('Теги').onChange(['tag', 'tag-hidden'])
    expect(onChange).not.toHaveBeenCalled()
    render(props)
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      accountKinds: kinds, includeShared: true, accountIds: ['personal', 'shared'],
      tagIds: ['tag', 'tag-hidden'], tagMode: 'and', types: ['expense'],
      includeTransferExpenses: true, includeTransferIncome: false,
    })
  })

  it.each([
    { scopes: ['personal'], expected: {} },
    { scopes: ['shared'], expected: { includeShared: true, onlyShared: true } },
    { scopes: ['personal', 'shared'], expected: { includeShared: true } },
    { scopes: [], expected: { includeShared: true } },
  ])('maps access selections $scopes to the existing API', ({ scopes, expected }) => {
    const onChange = vi.fn()
    render({ onChange })
    field('Доступ к счёту').onChange(scopes)
    render({ onChange })
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ accountKinds: ['spending'], ...expected })
  })

  it('clears all kinds and removes optional restrictions on apply', () => {
    const onChange = vi.fn()
    const props = { value: { accountIds: ['personal'], categoryIds: ['expense'], tagIds: ['tag'] }, onChange }
    render(props)
    for (const label of ['Тип средств', 'Конкретные счета', 'Категории расходов', 'Теги']) field(label).onChange([])
    render(props)
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ accountKinds: [] })
  })

  it('retains selected accounts outside the current scope and updates available accounts after changing kinds', () => {
    const props = { value: { accountIds: ['shared'] } }
    render(props)
    expect(field('Конкретные счета').options.map((option) => option.id)).toEqual(['personal', 'shared'])
    field('Тип средств').onChange(['deposit'])
    render(props)
    expect(field('Конкретные счета').options.map((option) => option.id)).toEqual(['shared', 'deposit'])
  })

  it('discards draft changes when closing without applying', () => {
    const onChange = vi.fn()
    const onOpenChange = vi.fn()
    render({ onChange, onOpenChange })
    field('Тип средств').onChange([])
    controls.buttons.get('Закрыть фильтры')!()
    expect(onChange).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets filters while retaining transfer display preferences', () => {
    const onChange = vi.fn()
    render({ value: { accountIds: ['shared'], accountKinds: ['spending'], onlyShared: true,
      categoryIds: ['expense'], tagIds: ['tag'], types: ['expense'], withoutTags: true,
      tagMode: 'and', includeTransferIncome: false }, onChange })
    controls.buttons.get('Сбросить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ accountKinds: [], includeShared: true, includeTransferIncome: false })
    render()
    expect(field('Доступ к счёту').selectedIds).toEqual([])
    expect(field('Тип средств').selectedIds).toEqual([])
    expect(field('Конкретные счета').selectedIds).toEqual([])
    expect(field('Категории расходов').selectedIds).toEqual([])
    expect(field('Теги').selectedIds).toEqual([])
    expect(field('Совпадение тегов').selectedIds).toEqual(['or'])
  })

  it('opens cleared type and access fields without an active filter badge after reset', () => {
    const markup = render({ value: { accountKinds: [], includeShared: true } })
    expect(field('Тип средств').selectedIds).toEqual([])
    expect(field('Доступ к счёту').selectedIds).toEqual([])
    expect(markup).toContain('aria-label="Фильтры"')
    expect(markup).not.toContain('Фильтры, активно:')
  })

  it('announces active filters without counting transfer preferences', () => {
    expect(render({ value: { accountIds: ['personal'], categoryIds: ['expense'], tagIds: ['tag'] } })).toContain('Фильтры, активно: 5')
    expect(render({ value: { includeTransferExpenses: true } })).toContain('aria-label="Фильтры, активно: 2"')
  })

  it.each([
    { value: {}, count: 2 },
    { value: { accountKinds: [] }, count: 1 },
    { value: { includeShared: true }, count: 1 },
    { value: { accountKinds: [], includeShared: true, onlyShared: true }, count: 1 },
    { value: { accountKinds: ACCOUNT_KIND_OPTIONS.map((option) => option.value), includeShared: true }, count: 0 },
  ])('counts effective kind and access restrictions: $count', ({ value, count }) => {
    const markup = render({ value })
    expect(markup).toContain(count ? `aria-label="Фильтры, активно: ${count}"` : 'aria-label="Фильтры"')
    if (count) expect(markup).toContain(`aria-hidden="true">${count}</ion-badge>`)
    else expect(markup).not.toContain('ion-badge')
  })
})
