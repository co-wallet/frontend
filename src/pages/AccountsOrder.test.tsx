import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '@/api/accounts'
import { AccountsPage } from './AccountsPage'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  buttons: new Map<string, { disabled?: boolean; onClick: () => void }>(),
  reorder: undefined as undefined | ((event: { detail: { from: number; to: number; complete: (value: boolean) => void } }) => void),
  accounts: [] as Account[],
  pending: false, error: null as Error | null,
  mutate: vi.fn(), reset: vi.fn(), invalidate: vi.fn(), setQueriesData: vi.fn(),
  success: undefined as undefined | ((data: undefined, ids: string[]) => Promise<void>),
  failure: undefined as undefined | (() => void),
}))

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = controls.cursor++
    if (!(index in controls.state)) controls.state[index] = typeof initial === 'function' ? initial() : initial
    return [controls.state[index], (value: unknown) => { controls.state[index] = value }]
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === 'accounts' ? controls.accounts : [], isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: controls.invalidate, setQueriesData: controls.setQueriesData }),
  useMutation: (options: { onSuccess?: typeof controls.success; onError?: typeof controls.failure }) => {
    if (options.onSuccess) controls.success = options.onSuccess
    if (options.onError) controls.failure = options.onError
    return { mutate: controls.mutate, reset: controls.reset, isPending: controls.pending, error: controls.error }
  },
}))

vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonButton: ({ children, onClick, disabled, 'aria-label': label }: {
    children: ReactNode; onClick: () => void; disabled?: boolean; 'aria-label'?: string
  }) => {
    if (label || typeof children === 'string') controls.buttons.set(label ?? String(children), { onClick, disabled })
    return <button disabled={disabled} aria-label={label}>{children}</button>
  },
  IonReorderGroup: ({ children, onIonReorderEnd }: { children: ReactNode; onIonReorderEnd: typeof controls.reorder }) => {
    controls.reorder = onIonReorderEnd
    return <div>{children}</div>
  },
}))

function render() {
  controls.cursor = 0
  controls.buttons.clear()
  return renderToStaticMarkup(<AccountsPage />)
}

function click(name: string) {
  const button = controls.buttons.get(name)!
  expect(button).toBeDefined()
  expect(button.disabled).not.toBe(true)
  button.onClick()
  return render()
}

beforeEach(() => {
  vi.clearAllMocks()
  controls.state = []
  controls.pending = false
  controls.error = null
  controls.accounts = ['Первый', 'Второй', 'Третий'].map((name, index) => ({
    id: String(index), name, ownerId: 'owner', accessMode: 'personal', kind: 'spending', currency: 'RUB', icon: null,
    initialBalance: 0, initialBalanceDate: '2026-10-12', createdAt: '', updatedAt: '',
  }))
})

describe('AccountsPage ordering', () => {
  it('moves accounts with arrows and cancels without saving', () => {
    render()
    click('Порядок')
    expect(controls.buttons.get('Поднять счёт Первый')?.disabled).toBe(true)
    expect(controls.buttons.get('Опустить счёт Третий')?.disabled).toBe(true)
    expect(controls.buttons.get('Сохранить')?.disabled).toBe(true)
    const changed = click('Поднять счёт Второй')
    expect(changed.indexOf('Второй')).toBeLessThan(changed.indexOf('Первый'))
    expect(changed).not.toContain('Редактировать счёт')
    const cancelled = click('Отмена')
    expect(cancelled.indexOf('Первый')).toBeLessThan(cancelled.indexOf('Второй'))
    expect(controls.mutate).not.toHaveBeenCalled()
  })

  it('completes Ionic drag without DOM mutation and saves the new order', async () => {
    render()
    click('Порядок')
    const complete = vi.fn()
    controls.reorder!({ detail: { from: 2, to: 0, complete } })
    render()
    expect(complete).toHaveBeenCalledWith(false)
    click('Сохранить')
    expect(controls.mutate).toHaveBeenCalledWith(['2', '0', '1'])
    await controls.success!(undefined, ['2', '0', '1'])
    expect(controls.setQueriesData).toHaveBeenCalledWith({ queryKey: ['accounts'] }, expect.any(Function))
    const update = controls.setQueriesData.mock.calls[0][1]
    expect(update(controls.accounts).map((a: Account) => a.id)).toEqual(['2', '0', '1'])
    expect(update(undefined)).toBeUndefined()
    expect(controls.invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    expect(render()).toContain('Порядок')
  })

  it('keeps the draft after an error and lets the user retry', () => {
    render()
    click('Порядок')
    click('Опустить счёт Первый')
    controls.error = new Error('offline')
    controls.failure!()
    expect(controls.invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    const markup = render()
    expect(markup).toContain('Не удалось сохранить порядок')
    expect(markup.indexOf('Второй')).toBeLessThan(markup.indexOf('Первый'))
    click('Сохранить')
    expect(controls.mutate).toHaveBeenCalledWith(['1', '0', '2'])
  })

  it('disables movement and cancellation while saving', () => {
    render()
    click('Порядок')
    controls.pending = true
    render()
    expect(controls.buttons.get('Отмена')?.disabled).toBe(true)
    expect(controls.buttons.get('Опустить счёт Первый')?.disabled).toBe(true)
  })

  it('does not offer ordering for a single account', () => {
    controls.accounts = controls.accounts.slice(0, 1)
    render()
    expect(controls.buttons.has('Порядок')).toBe(false)
  })
})
