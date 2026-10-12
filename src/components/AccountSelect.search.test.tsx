import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountSelect } from './AccountSelect'

const controls = vi.hoisted(() => ({
  state: [true, ''] as unknown[], cursor: 0,
  input: undefined as undefined | ((event: { detail: { value?: string | null } }) => void),
  open: undefined as undefined | (() => void),
  dismiss: undefined as undefined | (() => void),
  selectedLabel: '',
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
  EntityFormPicker: ({ onOpen, value }: { onOpen: () => void; value: string }) => {
    controls.open = onOpen
    controls.selectedLabel = value
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
    return <input aria-label="Поиск счетов" />
  },
  IonItem: ({ children, onClick, 'aria-label': label, 'aria-current': current }: {
    children: ReactNode; onClick: () => void; 'aria-label': string; 'aria-current'?: 'true'
  }) => {
    controls.options.set(label, onClick)
    return <button aria-label={label} aria-current={current}>{children}</button>
  },
}))

const accounts: ComponentProps<typeof AccountSelect>['accounts'] = [
  { id: 'foreign-card', name: 'Карта', currency: 'RUB', icon: null, ownerUsername: 'alice' },
  { id: 'shared', name: 'Общий счёт', currency: 'USD', icon: null, accessMode: 'shared' },
  { id: 'card', name: 'Карта', currency: 'RUB', icon: null, accessMode: 'personal' },
  { id: 'foreign-cash', name: 'Наличные', currency: 'EUR', icon: null, ownerUsername: 'bob' },
]

function render(props: Partial<ComponentProps<typeof AccountSelect>> = {}) {
  controls.cursor = 0
  controls.options.clear()
  return renderToStaticMarkup(<AccountSelect label="Со счёта" accounts={accounts} value="" onChange={vi.fn()} {...props} />)
}
function search(value?: string | null) {
  controls.input!({ detail: { value } })
  return render()
}
beforeEach(() => { controls.state = [true, ''] })

describe('account search and groups', () => {
  it('separates own and foreign accounts with dividers, preserving order within each group', () => {
    const markup = render()
    expect(markup.match(/<ion-item-divider/g)).toHaveLength(2)
    const labels = ['Мои счета', 'Общий счёт, USD', 'Карта, RUB', 'Чужие счета', 'Карта, @alice, RUB', 'Наличные, @bob, EUR']
    for (let i = 1; i < labels.length; i++) expect(markup.indexOf(labels[i - 1])).toBeLessThan(markup.indexOf(labels[i]))
  })

  it('filters both groups immediately by name with case and surrounding spaces ignored', () => {
    render()
    const markup = search('  КАРТ  ')
    expect([...controls.options.keys()]).toEqual(['Карта, RUB', 'Карта, @alice, RUB'])
    expect(markup).toContain('Мои счета')
    expect(markup).toContain('Чужие счета')
    expect(markup).not.toContain('Общий счёт')
    expect(markup).not.toContain('Наличные')
  })

  it.each(['', '   ', null, undefined])('restores both groups when cleared: %s', (value) => {
    render()
    search('КАРТ')
    search(value)
    expect(controls.options.size).toBe(4)
  })

  it('hides empty groups when only a foreign account matches', () => {
    render()
    const markup = search('налич')
    expect(markup).toContain('Чужие счета')
    expect(markup).not.toContain('Мои счета')
    expect([...controls.options.keys()]).toEqual(['Наличные, @bob, EUR'])
  })

  it('shows no results without changing the current selection', () => {
    const onChange = vi.fn()
    controls.state[1] = 'несуществующий'
    const markup = render({ value: 'card', onChange })
    expect(markup).toContain('Счета не найдены')
    expect(markup).toContain('role="status"')
    expect(markup).not.toContain('ion-item-divider')
    expect(controls.selectedLabel).toBe('Карта · RUB')
    expect(controls.options.size).toBe(0)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('selects a filtered foreign account and closes the selector', () => {
    const onChange = vi.fn()
    controls.state[1] = 'карт'
    const markup = render({ value: 'foreign-card', onChange })
    expect(markup).toContain('aria-current="true"')
    controls.options.get('Карта, @alice, RUB')!()
    expect(onChange).toHaveBeenCalledExactlyOnceWith('foreign-card')
    expect(controls.state[0]).toBe(false)
  })

  it('resets search on reopening', () => {
    render()
    search('налич')
    controls.dismiss!()
    controls.open!()
    render()
    expect(controls.state[0]).toBe(true)
    expect(controls.options.size).toBe(4)
  })

  it('keeps an own-only list compact and searchable', () => {
    const markup = render({ accounts: accounts.filter(a => !a.ownerUsername) })
    expect(markup).toContain('Поиск счетов')
    expect(markup).not.toContain('ion-item-divider')
  })

  it('shows unavailable accounts separately from an empty search result', () => {
    expect(render({ accounts: [] })).toContain('Нет доступных счетов')
  })
})
