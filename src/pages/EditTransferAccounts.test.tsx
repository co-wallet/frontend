import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IonInput } from '@ionic/react'
import type { AccountSelect } from '@/components/AccountSelect'
import { EditTransactionPage } from './EditTransactionPage'

const controls = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0,
  fields: new Map<string, ComponentProps<typeof IonInput>>(),
  pickers: new Map<string, ComponentProps<typeof AccountSelect>>(),
  save: undefined as undefined | { onClick: () => void; disabled: boolean },
  external: [] as { id: string; name: string; currency: string; icon: null; ownerUsername: string }[],
  error: false, readOnly: false,
  query: undefined as undefined | { enabled: boolean; queryFn: () => unknown },
  mutate: vi.fn(), lookup: vi.fn(), refetch: vi.fn(),
}))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = controls.cursor++
    if (!(index in controls.state)) controls.state[index] = initial
    return [controls.state[index], (value: unknown) => { controls.state[index] = value }]
  },
}))
vi.mock('react-router-dom', () => ({ useParams: () => ({ txID: 'tx' }), useHistory: () => ({ goBack: vi.fn() }) }))
vi.mock('@/api/accounts', () => ({ accountsApi: { transferAccounts: controls.lookup } }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: string[]; enabled: boolean; queryFn: () => unknown }) => {
    if (options.queryKey[0] === 'transfer-accounts') controls.query = options
    return { isLoading: false, isError: options.queryKey[0] === 'transfer-accounts' && controls.error, refetch: controls.refetch,
      data: options.queryKey[0] === 'accounts' ? [
        { id: 'source', name: 'Личная', currency: 'USD', accessMode: 'personal' },
        { id: 'shared', name: 'Общая', currency: 'USD', accessMode: 'shared' },
      ] : options.queryKey[0] === 'transfer-accounts' ? controls.external
      : options.queryKey[0] === 'transactions' ? {
        id: 'tx', accountId: 'source', accountName: 'Личная', accountOwnerUsername: 'sender',
        toAccountId: 'original', toAccountName: 'Карта', toAccountOwnerUsername: 'wallet_demo', toCurrency: 'USD',
        type: 'transfer', currency: 'USD', amount: 100, toAmount: null, date: '2026-10-12', shares: [], tags: [], readOnly: controls.readOnly,
      } : [],
    }
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: controls.mutate, isPending: false }),
}))
vi.mock('@/components/AccountSelect', () => ({ AccountSelect: (props: ComponentProps<typeof AccountSelect>) => {
  controls.pickers.set(props.label, props)
  return <div>{props.label}</div>
} }))
vi.mock('@ionic/react', async importOriginal => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonInput: (props: ComponentProps<typeof IonInput>) => { controls.fields.set(props.label!, props); return <div>{props.label}</div> },
  IonButton: (props: { children: unknown; onClick: () => void; disabled: boolean }) => {
    if (props.children === 'Сохранить') controls.save = props
    return <div />
  },
}))

function render() {
  controls.cursor = 0
  controls.fields.clear()
  controls.pickers.clear()
  return renderToStaticMarkup(<EditTransactionPage />)
}
function choose(label: string, id: string) {
  controls.pickers.get(label)!.onChange(id)
  return render()
}
beforeEach(() => {
  vi.clearAllMocks()
  controls.state = ['source', 'original', '100', '', '', '', '', '2026-10-12', [], false, {}, true, false]
  controls.external = [
    { id: 'original', name: 'Карта', currency: 'USD', icon: null, ownerUsername: 'wallet_demo' },
    { id: 'other', name: 'Другая карта', currency: 'EUR', icon: null, ownerUsername: 'alice' },
  ]
  controls.error = false
  controls.readOnly = false
  controls.save = undefined
  render()
})

describe('editing foreign transfer destinations', () => {
  it('loads the foreign catalog and keeps owner logins in selectable destinations', async () => {
    expect(controls.query!.enabled).toBe(true)
    await controls.query!.queryFn()
    expect(controls.lookup).toHaveBeenCalledWith()
    expect(controls.pickers.get('На счёт')!.accounts.map(a => a.id)).toEqual(['shared', 'original', 'other'])
    expect(controls.pickers.get('На счёт')!.accounts.find(a => a.id === 'original')!.ownerUsername).toBe('wallet_demo')
  })

  it('changes to another foreign account with a required converted amount', () => {
    choose('На счёт', 'other')
    expect(controls.save!.disabled).toBe(true)
    controls.fields.get('Сумма на счёт (EUR)')!.onIonInput!({ detail: { value: '80' } } as never)
    render()
    expect(controls.save!.disabled).toBe(false)
    controls.save!.onClick()
    expect(controls.mutate).toHaveBeenCalledWith(expect.objectContaining({ toAccountId: 'other', toAmount: 80, amount: 100 }))
  })

  it('keeps an unavailable historical destination visible with its owner and permits metadata edits', () => {
    controls.external = controls.external.filter(a => a.id !== 'original')
    render()
    expect(controls.pickers.get('На счёт')!.accounts.find(a => a.id === 'original')).toMatchObject({ ownerUsername: 'wallet_demo', name: 'Карта' })
    expect(controls.save!.disabled).toBe(false)
    controls.save!.onClick()
    expect(controls.mutate.mock.calls[0][0]).not.toHaveProperty('toAccountId')
  })

  it('excludes foreign destinations after moving to a shared source', () => {
    choose('Со счёта', 'shared')
    expect(controls.pickers.get('На счёт')!.accounts.map(a => a.id)).toEqual(['source'])
    expect(controls.pickers.get('На счёт')!.value).toBe('')
    expect(controls.save!.disabled).toBe(true)
  })

  it('preserves the historical destination during catalog errors', () => {
    controls.external = []
    controls.error = true
    const markup = render()
    expect(markup).toContain('Не удалось загрузить чужие счета')
    expect(controls.pickers.get('На счёт')!.accounts.find(a => a.id === 'original')!.ownerUsername).toBe('wallet_demo')
    expect(controls.save!.disabled).toBe(false)
  })

  it('shows foreign owner logins in read-only transfer details without enabling edits', () => {
    controls.readOnly = true
    const markup = render()
    expect(markup).toContain('Личная · @sender')
    expect(markup).toContain('Карта · @wallet_demo')
    expect(controls.query!.enabled).toBe(false)
    expect(controls.pickers.size).toBe(0)
  })
})
