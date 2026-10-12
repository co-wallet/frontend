import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { IonButton } from '@ionic/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FilterOptionList } from './FilterOptionList'

const controls = vi.hoisted(() => ({
  state: ['', false, false] as unknown[],
  cursor: 0,
  input: undefined as undefined | ((event: { detail: { value?: string | null } }) => void),
  buttons: new Map<string, () => void>(),
}))

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: () => {
    const index = controls.cursor++
    return [controls.state[index], (value: unknown) => { controls.state[index] = value }]
  },
}))

vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonSearchbar: ({ onIonInput, 'aria-label': label, value }: {
    onIonInput: typeof controls.input; 'aria-label': string; value: string
  }) => {
    controls.input = onIonInput
    return <input aria-label={label} value={value} readOnly />
  },
  IonButton: ({ children, onClick, ...props }: { children: ReactNode; onClick: () => void }) => {
    controls.buttons.set(String(children), onClick)
    return <button {...props}>{children}</button>
  },
}))

const options = Array.from({ length: 8 }, (_, index) => ({ id: `id-${index}`, name: `Вариант ${index}` }))
type Option = typeof options[number] & { hidden?: boolean }
type Props = ComponentProps<typeof FilterOptionList<Option>>

function render(props: Partial<Props> = {}) {
  controls.cursor = 0
  controls.buttons.clear()
  return renderToStaticMarkup(<FilterOptionList id="test" options={options} selectedIds={[]}
    searchLabel="Поиск вариантов" hiddenLabel="Скрытые варианты"
    renderOption={(option) => <span key={option.id} data-option={option.id}>{option.name}</span>}
    {...props} />)
}

function displayed(markup: string) {
  return [...markup.matchAll(/data-option="([^"]+)"/g)].map((match) => match[1])
}

beforeEach(() => { controls.state = ['', false, false] })

describe('FilterOptionList', () => {
  it('shows the first five options with an accessible expand control', () => {
    const markup = render()
    expect(displayed(markup)).toEqual(options.slice(0, 5).map((option) => option.id))
    expect(markup).toContain('aria-label="Поиск вариантов"')
    expect(markup).toContain('aria-controls="test-options"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('Показать все (8)')
  })

  it('expands and collapses the matching list', () => {
    render()
    controls.buttons.get('Показать все (8)')!()
    expect(displayed(render())).toEqual(options.map((option) => option.id))
    controls.buttons.get('Свернуть')!()
    expect(displayed(render())).toHaveLength(5)
  })

  it('shows every selected option in addition to five available options without duplicates', () => {
    const markup = render({ selectedIds: ['id-0', 'id-6', 'id-7'] })
    expect(displayed(markup)).toEqual(['id-0', 'id-6', 'id-7', 'id-1', 'id-2', 'id-3', 'id-4', 'id-5'])
    expect(markup).toContain('aria-label="Выбранные варианты"')
    expect(markup).not.toContain('Показать все')
    expect(displayed(render({ selectedIds: options.map((option) => option.id) }))).toHaveLength(8)
  })

  it('filters immediately by name ignoring case and surrounding spaces', () => {
    render()
    controls.input!({ detail: { value: '  ВАРИАНТ 7  ' } })
    expect(displayed(render())).toEqual(['id-7'])
  })

  it.each(['', '   ', null, undefined])('restores the compact list when cleared: %s', (value) => {
    render()
    controls.input!({ detail: { value: 'Вариант 7' } })
    render()
    controls.input!({ detail: { value } })
    expect(displayed(render())).toEqual(options.slice(0, 5).map((option) => option.id))
  })

  it('keeps nonmatching selected options visible without changing the selection', () => {
    const selectedIds = ['id-1', 'id-6']
    render({ selectedIds })
    controls.input!({ detail: { value: 'Вариант 7' } })
    expect(displayed(render({ selectedIds }))).toEqual(['id-1', 'id-6', 'id-7'])
    expect(selectedIds).toEqual(['id-1', 'id-6'])
  })

  it('shows an empty result while keeping selected options removable', () => {
    const onSelect = vi.fn()
    const renderOption = (option: Option) => <IonButton key={option.id} data-option={option.id} onClick={() => onSelect(option.id)}>{option.name}</IonButton>
    render({ selectedIds: ['id-6'], renderOption })
    controls.input!({ detail: { value: 'не существует' } })
    const markup = render({ selectedIds: ['id-6'], renderOption })
    expect(displayed(markup)).toEqual(['id-6'])
    expect(markup).toContain('role="status"')
    expect(markup).toContain('Ничего не найдено')
    expect(onSelect).not.toHaveBeenCalled()
    controls.buttons.get('Вариант 6')!()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('id-6')
  })

  it('does not announce an empty result when only a selected option matches', () => {
    render({ selectedIds: ['id-6'] })
    controls.input!({ detail: { value: 'Вариант 6' } })
    const markup = render({ selectedIds: ['id-6'] })
    expect(displayed(markup)).toEqual(['id-6'])
    expect(markup).not.toContain('Ничего не найдено')
  })

  it('keeps selected hidden options outside the closed disclosure and searches hidden options', () => {
    const hiddenOptions = [
      { id: 'hidden-selected', name: 'Архив', hidden: true },
      { id: 'hidden', name: 'Старая работа', hidden: true },
    ]
    const props = { options: [...options, ...hiddenOptions], selectedIds: ['hidden-selected'] }
    const markup = render(props)
    expect(markup.replace(/<details.*?<\/details>/g, '')).toContain('Архив')
    const disclosure = markup.match(/<details.*?<\/details>/)?.[0] ?? ''
    expect(disclosure).toContain('Старая работа')
    expect(disclosure).not.toContain('data-option="hidden-selected"')
    expect(disclosure).not.toMatch(/<details[^>]* open/)
    controls.input!({ detail: { value: 'РАБОТА' } })
    expect(displayed(render(props))).toEqual(['hidden-selected', 'hidden'])
    controls.input!({ detail: { value: 'не существует' } })
    expect(displayed(render(props))).toEqual(['hidden-selected'])
  })

  it('limits hidden options and expands them independently', () => {
    const props = { options: options.map((option) => ({ ...option, hidden: true })) }
    expect(displayed(render(props))).toHaveLength(5)
    controls.buttons.get('Показать все (8)')!()
    expect(displayed(render(props))).toHaveLength(8)
  })

  it('collapses an expanded list when the search changes', () => {
    render()
    controls.buttons.get('Показать все (8)')!()
    render()
    controls.input!({ detail: { value: 'ВАРИАНТ' } })
    expect(displayed(render())).toHaveLength(5)
  })

  it('omits the expand control for short and empty lists', () => {
    expect(render({ options: options.slice(0, 5) })).not.toContain('Показать все')
    expect(displayed(render({ options: [] }))).toEqual([])
  })
})
