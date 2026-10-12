import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '@/api/accounts'
import { MouseSensor, TouchSensor } from '@dnd-kit/core'
import { AccountsPage } from './AccountsPage'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  accounts: [] as Account[], pending: false, error: null as Error | null,
  mutate: vi.fn(), reset: vi.fn(), invalidate: vi.fn(), setQueriesData: vi.fn(),
  success: undefined as undefined | ((data: undefined, ids: string[]) => Promise<void>),
  failure: undefined as undefined | (() => void),
  start: undefined as undefined | (() => void),
  end: undefined as undefined | ((event: { active: { id: string }; over: { id: string } | null }) => void),
  cancel: undefined as undefined | (() => void),
  sensors: [] as { sensor: unknown; options: unknown }[],
  sortable: new Map<string, { disabled: boolean }>(),
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

vi.mock('@dnd-kit/core', () => ({
  MouseSensor: 'mouse', TouchSensor: 'touch', KeyboardSensor: 'keyboard', closestCenter: vi.fn(),
  useSensor: (sensor: unknown, options: unknown) => ({ sensor, options }),
  useSensors: (...sensors: typeof controls.sensors) => sensors,
  DndContext: ({ children, onDragStart, onDragEnd, onDragCancel, sensors }: {
    children: ReactNode; onDragStart: typeof controls.start; onDragEnd: typeof controls.end;
    onDragCancel: typeof controls.cancel; sensors: typeof controls.sensors
  }) => {
    controls.start = onDragStart
    controls.end = onDragEnd
    controls.cancel = onDragCancel
    controls.sensors = sensors
    return <div>{children}</div>
  },
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(), verticalListSortingStrategy: vi.fn(),
  useSortable: ({ id, disabled }: { id: string; disabled: boolean }) => {
    controls.sortable.set(id, { disabled })
    return { attributes: {}, listeners: {}, setNodeRef: vi.fn(), setActivatorNodeRef: vi.fn(), transform: null, isDragging: false }
  },
}))

function render() {
  controls.cursor = 0
  return renderToStaticMarkup(<AccountsPage />)
}

function drop(from: string, to: string | null) {
  controls.start!()
  render()
  controls.end!({ active: { id: from }, over: to === null ? null : { id: to } })
  return render()
}

beforeEach(() => {
  vi.clearAllMocks()
  controls.state = []
  controls.pending = false
  controls.error = null
  controls.sortable.clear()
  controls.accounts = ['Первый', 'Второй', 'Третий'].map((name, index) => ({
    id: String(index), name, ownerId: 'owner', accessMode: 'personal', kind: 'spending', currency: 'RUB', icon: null,
    initialBalance: 0, initialBalanceDate: '2026-10-12', createdAt: '', updatedAt: '',
  }))
})

describe('AccountsPage direct ordering', () => {
  it('uses delayed touch and mouse movement while preserving normal links and edit actions', () => {
    const markup = render()
    expect(controls.sensors).toContainEqual({ sensor: MouseSensor, options: { activationConstraint: { distance: { y: 8 } } } })
    expect(controls.sensors).toContainEqual({ sensor: TouchSensor, options: { activationConstraint: { delay: 350, tolerance: 8 } } })
    expect(markup).toContain('Удерживайте счёт')
    expect(markup).not.toContain('ion-reorder')
    expect(markup).not.toContain('Поднять счёт')
    expect(markup).not.toContain('Опустить счёт')
    expect(markup).not.toContain('>Порядок<')
    expect(markup).toContain('aria-label="Транзакции по счету Первый"')
    expect(markup).toContain('aria-label="Редактировать счёт Первый"')
  })

  it('updates the list on drop and immediately saves without another action', async () => {
    render()
    const markup = drop('2', '0')
    expect(markup.indexOf('Третий')).toBeLessThan(markup.indexOf('Первый'))
    expect(controls.mutate).toHaveBeenCalledWith(['2', '0', '1'])
    await controls.success!(undefined, ['2', '0', '1'])
    const update = controls.setQueriesData.mock.calls[0][1]
    expect(update(controls.accounts).map((a: Account) => a.id)).toEqual(['2', '0', '1'])
    expect(update(undefined)).toBeUndefined()
    expect(controls.invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] })
  })

  it.each([['0', '0'], ['0', null], ['missing', '0'], ['0', 'missing']])('ignores unchanged or invalid drops %s to %s', (from, to) => {
    render()
    drop(from!, to)
    expect(controls.mutate).not.toHaveBeenCalled()
  })

  it('cancels a drag without saving or changing the order', () => {
    render()
    controls.start!()
    render()
    controls.cancel!()
    const markup = render()
    expect(markup.indexOf('Первый')).toBeLessThan(markup.indexOf('Второй'))
    expect(controls.mutate).not.toHaveBeenCalled()
  })

  it('restores the saved order after an API error and permits another drag', () => {
    render()
    drop('0', '1')
    controls.error = new Error('offline')
    controls.failure!()
    expect(controls.invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    const markup = render()
    expect(markup).toContain('Прежний порядок восстановлен')
    expect(markup.indexOf('Первый')).toBeLessThan(markup.indexOf('Второй'))
    drop('0', '2')
    expect(controls.reset).toHaveBeenCalled()
    expect(controls.mutate).toHaveBeenLastCalledWith(['1', '2', '0'])
  })

  it('blocks a second reorder while saving and announces pending state', () => {
    render()
    drop('0', '1')
    controls.pending = true
    expect(render()).toContain('Сохраняем порядок')
    expect([...controls.sortable.values()].every((row) => row.disabled)).toBe(true)
    controls.mutate.mockClear()
    drop('0', '2')
    expect(controls.mutate).not.toHaveBeenCalled()
  })

  it('disables dragging for a single account', () => {
    controls.accounts = controls.accounts.slice(0, 1)
    expect(render()).not.toContain('Удерживайте счёт')
    expect(controls.sortable.get('0')?.disabled).toBe(true)
  })
})
