import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IonInput } from '@ionic/react'
import type { AccountSelect } from '@/components/AccountSelect'
import type { EntityFormHeader } from '@/components/EntityForm'
import { AddTransactionPage } from './AddTransactionPage'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  fields: new Map<string, ComponentProps<typeof IonInput>>(),
  pickers: new Map<string, ComponentProps<typeof AccountSelect>>(),
  header: undefined as ComponentProps<typeof EntityFormHeader> | undefined,
  retry: undefined as (() => void) | undefined,
  query: undefined as { enabled: boolean; queryKey: string[]; queryFn: () => unknown } | undefined,
  results: [{ id: 'foreign', name: 'Чужой', currency: 'USD', icon: null, ownerUsername: 'alice' }],
  fetching: false, error: false,
  mutate: vi.fn(), lookup: vi.fn(), refetch: vi.fn(),
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
      refetch: controls.refetch,
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
}))
vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonInput: (props: ComponentProps<typeof IonInput>) => { controls.fields.set(props.label!, props); return <div>{props.label}</div> },
  IonButton: (props: { children: unknown; onClick: () => void }) => {
    if (props.children === 'Повторить') controls.retry = props.onClick
    return <div />
  },
}))

function render() {
  controls.cursor = 0
  controls.fields.clear()
  controls.pickers.clear()
  return renderToStaticMarkup(<AddTransactionPage />)
}
function input(label: string, value: string) {
  controls.fields.get(label)!.onIonInput!({ detail: { value } } as never)
  return render()
}
function choose(label: string, value: string) {
  controls.pickers.get(label)!.onChange(value)
  return render()
}
beforeEach(() => {
  vi.clearAllMocks()
  controls.state = []
  controls.results = [{ id: 'foreign', name: 'Чужой', currency: 'USD', icon: null, ownerUsername: 'alice' }]
  controls.fetching = false
  controls.error = false
  render()
})

describe('transfer selectors without username search', () => {
  it('loads foreign accounts automatically and offers them beside own sources', async () => {
    expect(controls.query!.enabled).toBe(true)
    await controls.query!.queryFn()
    expect(controls.lookup).toHaveBeenCalledWith()
    expect(controls.pickers.get('Со счёта')!.accounts.map(a => a.id)).toEqual(['personal', 'shared', 'foreign'])
    expect(render()).not.toMatch(/Логин|Направление|Найти/)
  })

  it.each(['personal', 'shared'])('creates an immediate topup to %s with source currency and converted amount', (destination) => {
    choose('Со счёта', 'foreign')
    choose('На счёт', destination)
    input('Сумма (USD)', '100.1234')
    if (destination === 'shared') {
      expect(controls.header!.disabled).toBe(true)
      input('Сумма на счёт (EUR)', '80.4321')
    }
    const markup = render()
    expect(markup).not.toContain('Теги')
    expect(markup).not.toContain('Перевод создаётся сразу')
    expect(markup).not.toContain('Владелец счёта списания может удалить его')
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

  it('does not submit an account removed from the available catalog', () => {
    choose('Со счёта', 'foreign')
    choose('На счёт', 'personal')
    input('Сумма (USD)', '100')
    controls.results = []
    render()
    expect(controls.header!.disabled).toBe(true)
    controls.header!.onSubmit()
    expect(controls.mutate).not.toHaveBeenCalled()
  })

  it('clears a foreign destination after choosing a foreign source', () => {
    choose('Со счёта', 'personal')
    expect(controls.pickers.get('На счёт')!.accounts.map(a => a.id)).toEqual(['shared', 'foreign'])
    choose('На счёт', 'foreign')
    choose('Со счёта', 'foreign')
    expect(controls.pickers.get('На счёт')!.value).toBe('')
    expect(controls.pickers.get('На счёт')!.accounts.map(a => a.id)).toEqual(['personal', 'shared'])
    expect(controls.header!.disabled).toBe(true)
  })

  it('preserves outgoing transfers through the same selectors', () => {
    choose('Со счёта', 'personal')
    choose('На счёт', 'foreign')
    input('Сумма (USD)', '100')
    expect(render()).toContain('Теги')
    expect(controls.header!.disabled).toBe(false)
    controls.header!.onSubmit()
    expect(controls.mutate).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'personal', toAccountId: 'foreign', amount: 100 }))
  })

  it('shows loading and retry while preserving own account transfers', () => {
    controls.fetching = true
    expect(render()).toContain('ion-spinner')
    controls.fetching = false
    controls.error = true
    controls.results = []
    expect(render()).toContain('Не удалось загрузить чужие счета')
    controls.retry!()
    expect(controls.refetch).toHaveBeenCalled()
    choose('Со счёта', 'personal')
    choose('На счёт', 'shared')
    input('Сумма (USD)', '100')
    input('Сумма на счёт (EUR)', '80')
    expect(controls.header!.disabled).toBe(false)
  })
})
