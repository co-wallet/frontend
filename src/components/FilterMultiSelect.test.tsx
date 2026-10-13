import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FilterMultiSelect } from './FilterMultiSelect'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  buttons: new Map<string, () => void>(),
  checks: new Map<string, (checked: boolean) => void>(),
  search: undefined as undefined | ((value?: string | null) => void),
  dismiss: undefined as undefined | (() => void),
}))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = controls.cursor++
    if (!(index in controls.state)) controls.state[index] = initial
    return [controls.state[index], (next: unknown) => { controls.state[index] = next }]
  },
}))
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonModal: ({ children, onDidDismiss }: { children: ReactNode; onDidDismiss: () => void }) => {
      controls.dismiss = onDidDismiss
      return <div role="dialog">{children}</div>
    },
    IonButton: ({ children, onClick, ...props }: ComponentProps<typeof actual.IonButton>) => {
      controls.buttons.set(props['aria-label'] ?? String(children), () => onClick?.({} as Parameters<NonNullable<typeof onClick>>[0]))
      return <actual.IonButton {...props}>{children}</actual.IonButton>
    },
    IonCheckbox: ({ children, checked, onIonChange }: ComponentProps<typeof actual.IonCheckbox>) => {
      controls.checks.set(String(children), (next) => onIonChange?.({ detail: { checked: next } } as Parameters<NonNullable<typeof onIonChange>>[0]))
      return <label><input type="checkbox" checked={checked} readOnly />{children}</label>
    },
    IonSearchbar: ({ value, onIonInput, ...props }: ComponentProps<typeof actual.IonSearchbar>) => {
      controls.search = (next) => onIonInput?.({ detail: { value: next } } as Parameters<NonNullable<typeof onIonInput>>[0])
      return <input aria-label={props['aria-label']} value={value ?? ''} readOnly />
    },
  }
})
const options = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Счёт ${i}`, hidden: i > 5 }))
type Props = ComponentProps<typeof FilterMultiSelect>
function render(props: Partial<Props> = {}) {
  controls.cursor = 0
  controls.buttons.clear()
  controls.checks.clear()
  return renderToStaticMarkup(<FilterMultiSelect label="Счета" options={options} selectedIds={[]}
    onChange={vi.fn()} searchLabel="Поиск счетов" {...props} />)
}
function open(props: Partial<Props> = {}) {
  render(props)
  const trigger = [...controls.buttons.keys()][0]
  controls.buttons.get(trigger)!()
  return render(props)
}
beforeEach(() => { controls.state = [] })

describe('FilterMultiSelect', () => {
  it('keeps the closed row compact with first selected name and the count of the rest', () => {
    const markup = render({ selectedIds: ['3', '1', '7'] })
    expect(markup).toContain('aria-label="Счета: Счёт 3 +2"')
    expect(markup).toContain('filter-multiselect-count">+2')
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toContain('Счёт 1')
    expect(markup).not.toContain('Поиск счетов')
  })

  it('shows empty and single selections without a counter, ignoring missing options', () => {
    expect(render()).toContain('Счета: Не выбрано')
    const markup = render({ selectedIds: ['missing', '2'] })
    expect(markup).toContain('Счета: Счёт 2')
    expect(markup).not.toContain('filter-multiselect-count')
  })

  it('opens a complete list with select-all and clear-all actions', () => {
    const markup = open()
    expect(controls.checks.size).toBe(8)
    expect(markup).toContain('Выбрать все')
    expect(markup).toContain('Снять все')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).not.toContain('Показать все')
    expect(markup).toContain('Скрытые варианты (2)')
  })

  it('selects every option regardless of search and clears every selected option', () => {
    const onChange = vi.fn()
    open({ onChange, selectedIds: ['1'] })
    controls.search!('Счёт 3')
    render({ onChange, selectedIds: ['1'] })
    controls.buttons.get('Выбрать все')!()
    expect(onChange).toHaveBeenLastCalledWith(options.map((option) => option.id))
    controls.buttons.get('Снять все')!()
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('selects and deselects individual options without duplicates', () => {
    const onChange = vi.fn()
    open({ selectedIds: ['1', '2'], onChange })
    controls.checks.get('Счёт 3')!(true)
    expect(onChange).toHaveBeenLastCalledWith(['1', '2', '3'])
    controls.checks.get('Счёт 1')!(true)
    expect(onChange).toHaveBeenLastCalledWith(['2', '1'])
    controls.checks.get('Счёт 1')!(false)
    expect(onChange).toHaveBeenLastCalledWith(['2'])
  })

  it('searches all options with trimmed case-insensitive text and exposes hidden matches', () => {
    open()
    controls.search!('  СЧЁТ 7  ')
    const markup = render()
    expect([...controls.checks.keys()]).toEqual(['Счёт 7'])
    expect(markup).not.toContain('<details')
  })

  it('does not change selection when search has no results', () => {
    const onChange = vi.fn()
    open({ selectedIds: ['1'], onChange })
    controls.search!('нет совпадений')
    const markup = render({ selectedIds: ['1'], onChange })
    expect(controls.checks.size).toBe(0)
    expect(markup).toContain('Ничего не найдено')
    expect(markup).toContain('role="status"')
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each(['', '   ', null, undefined])('restores all options when search is cleared to %s', (value) => {
    open()
    controls.search!('Счёт 1')
    render()
    controls.search!(value)
    render()
    expect(controls.checks.size).toBe(8)
  })

  it('keeps selected hidden options outside closed disclosures without duplicates', () => {
    const markup = open({ selectedIds: ['7'] })
    expect(markup.replace(/<details.*?<\/details>/g, '')).toContain('Счёт 7')
    expect(markup.match(/Счёт 7<\/label>/g)).toHaveLength(1)
    expect(markup).not.toMatch(/<details[^>]* open/)
  })

  it('closes with Done and resets search when reopened', () => {
    open()
    controls.search!('Счёт 1')
    render()
    controls.buttons.get('Готово')!()
    expect(render()).not.toContain('role="dialog"')
    open()
    expect(controls.checks.size).toBe(8)
    controls.dismiss!()
    expect(render()).not.toContain('role="dialog"')
  })

  it('supports lists without search and empty lists', () => {
    const markup = open({ options: [], searchLabel: undefined })
    expect(markup).not.toContain('Поиск счетов')
    expect(markup).toContain('Нет доступных вариантов')
    expect(markup).toContain('disabled="true"')
  })
})
