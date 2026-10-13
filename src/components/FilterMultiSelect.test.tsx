import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FilterMultiSelect } from './FilterMultiSelect'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  buttons: new Map<string, () => void>(),
  checks: new Map<string, () => void>(),
  search: undefined as undefined | ((value?: string | null) => void),
  dismiss: undefined as undefined | (() => void),
}))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = controls.cursor++
    if (!(index in controls.state)) controls.state[index] = initial
    return [controls.state[index], (next: unknown) => { controls.state[index] = typeof next === 'function' ? next(controls.state[index]) : next }]
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
    IonItem: ({ children, onClick, ...props }: ComponentProps<typeof actual.IonItem>) => {
      controls.checks.set(props['aria-label'] ?? '', () => onClick?.({} as Parameters<NonNullable<typeof onClick>>[0]))
      return <div role={props.role} aria-label={props['aria-label']} aria-checked={props['aria-checked']}>{children}</div>
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
  it('allows exactly one selection in single-select mode and resets to the first option', () => {
    const onChange = vi.fn()
    const props = { singleSelect: true, selectedIds: ['0'], onChange }
    open(props)
    controls.checks.get('Счёт 1')!()
    let markup = render(props)
    expect(markup).toContain('role="radio" aria-label="Счёт 1" aria-checked="true"')
    expect(markup).toContain('role="radio" aria-label="Счёт 0" aria-checked="false"')
    controls.checks.get('Счёт 1')!()
    markup = render(props)
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1)
    expect(onChange).not.toHaveBeenCalled()
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['1'])
    open({ ...props, selectedIds: ['1'] })
    controls.buttons.get('Сбросить')!()
    render(props)
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenLastCalledWith(['0'])
  })
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

  it('supports an unrestricted label for an empty selection', () => {
    expect(render({ label: 'Тип средств', emptyLabel: 'Все типы средств' }))
      .toContain('aria-label="Тип средств: Все типы средств"')
  })

  it('opens a complete list styled like the transaction picker without select-all or a count', () => {
    const markup = open()
    expect(controls.checks.size).toBe(8)
    expect(markup).toContain('Сбросить')
    expect(markup).toContain('Применить')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).not.toContain('Выбрать все')
    expect(markup).not.toContain('Выбрано:')
    expect(markup).toContain('Скрытые варианты (2)')
    expect(markup).toContain('inset="true"')
  })

  it('resets the draft without closing or saving, then applies the cleared selection', () => {
    const onChange = vi.fn()
    const props = { selectedIds: ['1', '2'], onChange }
    open(props)
    controls.buttons.get('Сбросить')!()
    const markup = render(props)
    expect(markup).toContain('role="dialog"')
    expect(markup).not.toContain('aria-checked="true"')
    expect(onChange).not.toHaveBeenCalled()
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith([])
    expect(render(props)).not.toContain('role="dialog"')
  })

  it('selects and deselects individual draft options and saves only on Apply', () => {
    const onChange = vi.fn()
    const props = { selectedIds: ['1', '2'], onChange }
    open(props)
    controls.checks.get('Счёт 3')!()
    render(props)
    controls.checks.get('Счёт 1')!()
    const markup = render(props)
    expect(markup).toContain('aria-label="Счёт 3" aria-checked="true"')
    expect(markup).toContain('aria-label="Счёт 1" aria-checked="false"')
    expect(onChange).not.toHaveBeenCalled()
    controls.buttons.get('Применить')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['2', '3'])
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
    expect(markup.match(/aria-label="Счёт 7"/g)).toHaveLength(1)
    expect(markup).not.toMatch(/<details[^>]* open/)
  })

  it('discards edits on Close or backdrop dismissal and resets search when reopened', () => {
    const onChange = vi.fn()
    const props = { selectedIds: ['1'], onChange }
    open(props)
    controls.checks.get('Счёт 3')!()
    controls.search!('Счёт 1')
    render(props)
    controls.buttons.get('Закрыть')!()
    expect(render(props)).not.toContain('role="dialog"')
    const markup = open(props)
    expect(controls.checks.size).toBe(8)
    expect(markup).toContain('aria-label="Счёт 3" aria-checked="false"')
    expect(onChange).not.toHaveBeenCalled()
    controls.dismiss!()
    expect(render(props)).not.toContain('role="dialog"')
  })

  it('supports lists without search and empty lists', () => {
    const markup = open({ options: [], searchLabel: undefined })
    expect(markup).not.toContain('Поиск счетов')
    expect(markup).toContain('Нет доступных вариантов')
    expect(markup).not.toContain('disabled="true"')
  })
})
