import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { InvitePage } from './InvitePage'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'invite-token' }),
  useHistory: () => ({ replace: vi.fn() }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => (
    queryKey[0] === 'invite'
      ? { data: { email: 'alice@example.com' }, isLoading: false, isError: false }
      : { data: [] }
  ),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/api/invites', () => ({ invitesApi: {} }))
vi.mock('@/api/currencies', () => ({ currenciesApi: {} }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { setAuth: ReturnType<typeof vi.fn> }) => unknown) => (
    selector({ setAuth: vi.fn() })
  ),
}))

describe('InvitePage', () => {
  it('preselects RUB for a new user', () => {
    const markup = renderToStaticMarkup(<InvitePage />)

    expect(markup).toMatch(/<ion-select[^>]*value="RUB"/)
    expect(markup).toContain('<ion-select-option value="RUB">RUB</ion-select-option>')
  })
})
