import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { AppMenu } from './AppMenu'

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ replace: vi.fn() }),
  useLocation: () => ({ pathname: '/transactions' }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { isAdmin: false },
    logout: vi.fn(),
  }),
}))

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (state: unknown) => unknown) => selector({
    mode: 'system',
    setMode: vi.fn(),
  }),
}))

describe('AppMenu', () => {
  it('does not install the global swipe gesture that can leave iOS input blocked', () => {
    const markup = renderToStaticMarkup(<AppMenu />)

    expect(markup).toContain('swipe-gesture="false"')
    expect(markup).toContain('content-id="main-content"')
  })
})
