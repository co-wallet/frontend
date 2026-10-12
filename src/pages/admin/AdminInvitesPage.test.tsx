import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminInvitesPage } from './AdminInvitesPage'

const state = vi.hoisted(() => ({ inviteUrl: null as string | null }))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(initial === null ? state.inviteUrl : initial),
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('AdminInvitesPage creation notice', () => {
  beforeEach(() => { state.inviteUrl = null })

  it('provides labelled invitation creation in the header and only back navigation at the bottom', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><AdminInvitesPage /></MemoryRouter>)
    expect(markup).toMatch(/<ion-buttons slot="end"><ion-button[^>]*aria-label="Создать приглашение"/)
    expect(markup).toContain('aria-label="Назад"')
    expect(markup).not.toContain('horizontal="end"')
    expect(markup).not.toContain('Добавить транзакцию')
  })

  it('only shows the notice after creating an invitation', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><AdminInvitesPage /></MemoryRouter>)
    expect(markup).not.toContain('Приглашение создано!')
  })

  it('uses a neutral theme surface behind success text and keeps the invitation link', () => {
    state.inviteUrl = 'http://localhost:3000/invite/test-preview'
    const markup = renderToStaticMarkup(<MemoryRouter><AdminInvitesPage /></MemoryRouter>)

    expect(markup).toMatch(/background:var\(--ion-background-color-step-50\)[^]*<ion-text color="success"[^]*Приглашение создано![^]*Отправьте эту ссылку пользователю:/)
    expect(markup).toContain(state.inviteUrl)
    expect(markup).toMatch(/<code[^>]*text-overflow:ellipsis[^]*test-preview<\/code><ion-button[^>]*fill="clear"/)
  })
})
