import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountFormModal } from './AccountsPage'
import { AccountMembersPage } from './AccountMembersPage'
import { AccountMembersFields } from '@/components/AccountMembersFields'

vi.mock('@/store/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'owner', username: 'alice' } }) }))

const state = vi.hoisted(() => ({ error: false }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'account' ? { ownerId: 'owner', name: 'Family' }
      : queryKey[0] === 'account-members' ? [{ userId: 'owner', username: 'alice', defaultShare: 0.3333 }, { userId: 'bob', username: 'bob', defaultShare: 0.6667 }]
      : queryKey[0] === 'users' ? [{ id: 'owner', username: 'alice' }, { id: 'bob', username: 'bob' }] : [],
    isLoading: false, isError: state.error,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('react-router-dom', () => ({ useParams: () => ({ accountID: 'a' }), useHistory: () => ({ push: vi.fn() }) }))
vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

beforeEach(() => {
  state.error = false
})

describe('account configuration UI', () => {
  it.each([true, false])('renders fixed mode even for owner=%s', (owner) => {
    const markup = renderToStaticMarkup(<AccountFormModal isOpen onClose={vi.fn()} defaultCurrency="USD" onSubmit={vi.fn()} loading={false}
      isEditing canChangeTransferAcceptance={owner} initial={{ accessMode: 'shared', name: 'Family' }} onManageMembers={vi.fn()} title="Редактировать счёт" />)
    expect(markup).toContain('Участники и доли')
    expect(markup).toContain('создайте новый счёт')
    expect(markup).not.toContain('ion-toggle')
    expect(markup).not.toContain('Добавить участника')
    expect(markup).not.toContain('label="Доля')
  })
  it('provides mode and owner share controls during shared account creation', () => {
    const markup = renderToStaticMarkup(<AccountFormModal isOpen onClose={vi.fn()} defaultCurrency="USD" onSubmit={vi.fn()} loading={false}
      initial={{ accessMode: 'shared', name: 'Family' }} title="Новый счёт" />)
    expect(markup).toContain('ion-toggle')
    expect(markup).toContain('Доля alice')
    expect(markup).toContain('Добавить участника')
  })
  it('shows fixed shares without mutation controls for the owner', () => {
    const markup = renderToStaticMarkup(<AccountMembersPage />)
    expect(markup).toContain('33.33%')
    expect(markup).toContain('66.67%')
    expect(markup).toContain('Владелец')
    expect(markup).toContain('создайте новый счёт')
    expect(markup).not.toMatch(/ion-input|ion-fab|ion-item-option|Добавить участника|Сохранить/)
  })
  it('shows a load failure instead of empty membership', () => {
    state.error = true
    expect(renderToStaticMarkup(<AccountMembersPage />)).toContain('Не удалось загрузить участников')
  })
  it('shows share validation and permits removing only draft guests', () => {
    const markup = renderToStaticMarkup(<AccountMembersFields ownerUsername="alice" value={[{ username: 'alice', share: '0.5' }, { username: 'bob', share: '0.4' }]} onChange={vi.fn()} error="Сумма долей — 1" />)
    expect(markup).toContain('Сумма долей — 1')
    expect(markup).toContain('Убрать участника 2')
    expect(markup).not.toContain('Убрать участника 1')
  })
})
