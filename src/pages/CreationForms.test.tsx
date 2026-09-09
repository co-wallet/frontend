import type { ComponentType, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountsPage } from './AccountsPage'
import CategoriesPage from './CategoriesPage'
import { TagsPage } from './TagsPage'
import { AddTransactionPage } from './AddTransactionPage'
import { AccountMembersPage } from './AccountMembersPage'
import { AdminCurrenciesPage } from './admin/AdminCurrenciesPage'
import { AdminInvitesPage } from './admin/AdminInvitesPage'

const mutationState = vi.hoisted(() => ({ pending: false }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === 'account' ? undefined : [], isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: mutationState.pending }),
}))
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: vi.fn() }),
  useLocation: () => ({ search: '' }),
  useParams: () => ({ accountID: 'account-1' }),
}))
// Render modal contents on the server so the forms can be checked without Ionic's overlay runtime.
vi.mock('@ionic/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/react')>(),
  IonModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const forms: [string, ComponentType][] = [
  ['Новый счёт', AccountsPage],
  ['Новая категория', CategoriesPage],
  ['Новый тег', TagsPage],
  ['Новая транзакция', AddTransactionPage],
  ['Добавить участника', AccountMembersPage],
  ['Новая валюта', AdminCurrenciesPage],
  ['Новое приглашение', AdminInvitesPage],
]

describe.each(forms)('%s creation form', (title, Page) => {
  beforeEach(() => { mutationState.pending = false })

  it('shows consistent actions and prevents saving an empty form', () => {
    const markup = renderToStaticMarkup(<Page />)
    const header = Array.from(markup.matchAll(/<ion-header>([^]*?)<\/ion-header>/g), (match) => match[1]).find((header) => header.includes(title))
    expect(header).toContain(title)
    expect(header).toMatch(/slot="start"[^]*Отмена[^]*slot="end"[^]*Сохранить/)
    expect(header).toMatch(/<ion-button[^>]*disabled="true"[^>]*aria-label="Сохранить"/)
    expect(markup).toContain('<ion-list-header><ion-label>')
  })

  it('keeps the save action disabled and labelled while its request is pending', () => {
    mutationState.pending = true
    const markup = renderToStaticMarkup(<Page />)
    const header = Array.from(markup.matchAll(/<ion-header>([^]*?)<\/ion-header>/g), (match) => match[1]).find((header) => header.includes(title))
    expect(header).toContain('aria-label="Сохранить"')
    expect(header).toContain('<ion-spinner name="dots"')
    expect(header).toContain('disabled="true"')
  })
})
