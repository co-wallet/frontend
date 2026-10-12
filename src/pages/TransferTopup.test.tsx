import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IonInput } from '@ionic/react'
import type { AccountSelect } from '@/components/AccountSelect'
import type { EntityFormHeader, EntityFormSelect } from '@/components/EntityForm'
import { AddTransactionPage } from './AddTransactionPage'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  fields: new Map<string, ComponentProps<typeof IonInput>>(),
  pickers: new Map<string, ComponentProps<typeof AccountSelect>>(),
  mode: undefined as ComponentProps<typeof EntityFormSelect> | undefined,
  header: undefined as ComponentProps<typeof EntityFormHeader> | undefined,
  search: undefined as (() => void) | undefined,
  query: undefined as { enabled: boolean; queryKey: string[]; queryFn: () => unknown } | undefined,
  results: [{ id: 'foreign', name: 'Чужой', currency: 'USD', icon: null }],
  fetching: false, error: false,
  mutate: vi.fn(), lookup: vi.fn(),
}))

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = controls.cursor++
    if (!(index in controls.state)) controls.state[index] = typeof initial === 'function' ? initial() : initial
    return [controls.state[index], (value: unknown) => { controls.state[index] = value }]
  },
}))
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ goBack: vi.fn(), replace: vi.fn() }),
  useLocation: () => ({ search: '?type=transfer', state: undefined }),
}))
vi.mock('@/api/accounts', () => ({ accountsApi: { transferAccounts: controls.lookup } }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: NonNullable<typeof controls.query>) => {
    if (options.queryKey[0] === 'transfer-accounts') controls.query = options
    return {
      data: options.queryKey[0] === 'accounts' ? [
        { id: 'personal', name: 'Мой', currency: 'USD', accessMode: 'personal' },
        { id: 'shared', name: 'Общий', currency: 'EUR', accessMode: 'shared' },
      ] : options.queryKey[0] === 'transfer-accounts' ? controls.results : [],
      isFetching: options.queryKey[0] === 'transfer-accounts' && controls.fetching,
      isError: options.queryKey[0] === 'transfer-accounts' && controls.error,
      refetch: vi.fn(),
    }
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: controls.mutate, isPending: false }),
}))
vi.mock('@/components/AccountSelect', () => ({ AccountSelect: (props: ComponentProps<typeof AccountSelect>) => {
  controls.pickers.set(props.label, props)
  return <div>{props.label}</div>
} }))
vi.mock('@/components/EntityForm', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/components/EntityForm')>(),
  EntityFormHeader: (props: ComponentProps<typeof EntityFormHeader>) => { controls.header = props; return <div>{props.title}</div> },
  EntityFormSelect: (props: ComponentProps<typeof EntityFormSelect>) => {
    if (props.label === 'Направление') controls.mode = props
    return <div>{props.children}</div>
  },
}))
vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonInput: (props: ComponentProps<typeof IonInput>) => { controls.fields.set(props.label!, props); return <div>{props.label}</div> },
  IonButton: (props: { children: unknown; onClick: () => void }) => {
    if (props.children === 'Найти') controls.search = props.onClick
    return <div />
  },
}))

function render() {
  controls.cursor = 0
  controls.fields.clear()
  controls.pickers.clear()
  return renderToStaticMarkup(<AddTransactionPage />)
}
function mode(value: string) {
  controls.mode!.onIonChange!({ detail: { value } } as never)
  return render()
}
function input(label: string, value: string) {
  controls.fields.get(label)!.onIonInput!({ detail: { value } } as never)
  return render()
}
function choose(label: string, value: string) {
  controls.pickers.get(label)!.onChange(value)
  return render()
}
function findSource() {
  mode('fromOther')
  input('Логин владельца счёта', ' alice ')
  controls.search!()
  render()
}

beforeEach(() => {
  vi.clearAllMocks()
  controls.state = []
  controls.results = [{ id: 'foreign', name: 'Чужой', currency: 'USD', icon: null }]
  controls.fetching = false
  controls.error = false
  render()
})

describe('external account topups', () => {
  it('finds the source by exact username and offers personal and shared destinations', async () => {
    findSource()
    expect(controls.query!.enabled).toBe(true)
    await controls.query!.queryFn()
    expect(controls.lookup).toHaveBeenCalledWith('alice')
    expect(controls.pickers.get('Со счёта')!.accounts.map(a => a.id)).toEqual(['foreign'])
    expect(controls.pickers.get('На счёт')!.accounts.map(a => a.id)).toEqual(['personal', 'shared'])
    expect(render()).not.toContain('Теги')
  })

  it.each(['personal', 'shared'])('creates an immediate topup to %s with source currency and converted amount', (destination) => {
    findSource()
    choose('Со счёта', 'foreign')
    choose('На счёт', destination)
    input('Сумма (USD)', '100.1234')
    if (destination === 'shared') {
      expect(controls.header!.disabled).toBe(true)
      input('Сумма на счёт (EUR)', '80.4321')
    }
    expect(controls.header!.disabled).toBe(false)
    controls.header!.onSubmit()
    expect(controls.mutate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'transfer', accountId: 'foreign', toAccountId: destination, amount: 100.1234, currency: 'USD',
      ...(destination === 'shared' ? { toAmount: 80.4321 } : {}),
    }))
    const dto = controls.mutate.mock.calls[0][0]
    expect(dto).not.toHaveProperty('shares')
    expect(dto).not.toHaveProperty('tags')
    expect(dto).not.toHaveProperty('defaultCurrencyAmount')
  })

  it('clears an old source when the username changes and requires a new search', () => {
    findSource()
    choose('Со счёта', 'foreign')
    choose('На счёт', 'personal')
    input('Сумма (USD)', '100')
    input('Логин владельца счёта', 'bob')
    expect(controls.query!.enabled).toBe(false)
    expect(controls.pickers.get('Со счёта')!.accounts).toEqual([])
    expect(controls.pickers.get('Со счёта')!.value).toBe('')
    expect(controls.header!.disabled).toBe(true)
    controls.header!.onSubmit()
    expect(controls.mutate).not.toHaveBeenCalled()
  })

  it('clears selected accounts across direction changes and retains personal-only outgoing sources', () => {
    findSource()
    choose('Со счёта', 'foreign')
    choose('На счёт', 'shared')
    mode('other')
    expect(controls.pickers.get('Со счёта')!.accounts.map(a => a.id)).toEqual(['personal'])
    expect(controls.pickers.get('Со счёта')!.value).toBe('')
    expect(controls.pickers.get('На счёт')!.accounts).toEqual([])
    expect(controls.header!.disabled).toBe(true)
    mode('own')
    expect(controls.pickers.get('Со счёта')!.accounts.map(a => a.id)).toEqual(['personal', 'shared'])
  })

  it('shows search failures and empty results without permitting creation', () => {
    findSource()
    controls.results = []
    expect(render()).toContain('Нет доступных счетов')
    expect(controls.header!.disabled).toBe(true)
    controls.error = true
    expect(render()).toContain('Не удалось найти счета')
    controls.header!.onSubmit()
    expect(controls.mutate).not.toHaveBeenCalled()
  })
})
