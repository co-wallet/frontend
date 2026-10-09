import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Category } from '@/api/categories'
import { CategorySelect } from './CategorySelect'

const controls = vi.hoisted(() => ({
  state: [true, ''] as unknown[],
  cursor: 0,
  input: undefined as undefined | ((event: { detail: { value?: string | null } }) => void),
  open: undefined as undefined | (() => void),
  dismiss: undefined as undefined | (() => void),
  options: new Map<string, () => void>(),
}))

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: () => {
    const index = controls.cursor++
    return [controls.state[index], (value: unknown) => { controls.state[index] = value }]
  },
}))

vi.mock('./EntityForm', () => ({
  EntityFormPicker: ({ onOpen }: { onOpen: () => void }) => {
    controls.open = onOpen
    return null
  },
}))

vi.mock('./EntitySelectModal', () => ({
  EntitySelectModal: ({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) => {
    controls.dismiss = onDismiss
    return <div>{children}</div>
  },
}))

vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonSearchbar: ({ onIonInput }: { onIonInput: typeof controls.input }) => {
    controls.input = onIonInput
    return <input aria-label="Поиск категорий" />
  },
  IonItem: ({ children, onClick, 'aria-label': label }: {
    children: ReactNode; onClick: () => void; 'aria-label': string
  }) => {
    controls.options.set(label, onClick)
    return <button aria-label={label}>{children}</button>
  },
}))

const categories: Category[] = [
  { id: 'food', name: 'Продукты', type: 'expense' },
  { id: 'cafe', name: 'Кофейни', type: 'expense' },
  { id: 'hidden', name: 'Старая кофейня', type: 'expense', hidden: true },
].map((category) => ({ userId: 'user', icon: null, createdAt: '2026-10-09', ...category } as Category))

function render(props: Partial<ComponentProps<typeof CategorySelect>> = {}) {
  controls.cursor = 0
  controls.options.clear()
  return renderToStaticMarkup(<CategorySelect categories={categories} type="expense" value=""
    onChange={vi.fn()} {...props} />)
}

function search(value?: string | null) {
  controls.input!({ detail: { value } })
  return render()
}

beforeEach(() => {
  controls.state = [true, '']
})

describe('category search', () => {
  it('filters immediately by a case-insensitive substring with surrounding spaces ignored', () => {
    render()
    const markup = search('  КОФЕ  ')
    expect(markup).toContain('Кофейни')
    expect(markup).not.toContain('Продукты')
    expect(markup).not.toContain('Без категории')
    expect(markup).not.toContain('Старая кофейня')
  })

  it.each(['', '   ', null, undefined])('restores the full visible list when cleared: %s', (value) => {
    render()
    search('кофе')
    const markup = search(value)
    expect(markup).toContain('Кофейни')
    expect(markup).toContain('Продукты')
    expect(markup).toContain('Без категории')
    expect(markup).not.toContain('Старая кофейня')
  })

  it('shows an empty result without changing the selected category', () => {
    const onChange = vi.fn()
    controls.state[1] = 'несуществующая'
    expect(render({ value: 'food', onChange })).toContain('Категории не найдены')
    expect(controls.options.size).toBe(0)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the selected hidden category searchable', () => {
    controls.state[1] = 'КОФЕ'
    const markup = render({ value: 'hidden' })
    expect(markup).toContain('Старая кофейня')
    expect(markup).toContain('Выбрано')
  })

  it('selects a filtered category and closes the picker', () => {
    const onChange = vi.fn()
    controls.state[1] = 'кофе'
    render({ onChange })
    controls.options.get('Кофейни')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith('cafe')
    expect(controls.state[0]).toBe(false)
  })

  it('allows searching for and selecting the uncategorized option', () => {
    const onChange = vi.fn()
    controls.state[1] = 'БЕЗ'
    render({ value: 'food', onChange })
    expect([...controls.options.keys()]).toEqual(['Без категории'])
    controls.options.get('Без категории')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith('')
  })

  it('resets the search after dismissal and reopening', () => {
    render()
    search('кофе')
    controls.dismiss!()
    expect(controls.state[0]).toBe(false)
    controls.open!()
    const markup = render()
    expect(controls.state[0]).toBe(true)
    expect(markup).toContain('Продукты')
    expect(markup).toContain('Без категории')
  })

  it('handles an empty category list', () => {
    controls.state[1] = 'кофе'
    expect(render({ categories: [] })).toContain('Категории не найдены')
  })
})
