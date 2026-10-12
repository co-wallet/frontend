import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppMenu } from './AppMenu'
import type { ComponentProps } from 'react'
import type { IonItem } from '@ionic/react'

const state = vi.hoisted(() => ({ admin: false, items: [] as ComponentProps<typeof IonItem>[] }))
afterEach(() => { state.admin = false; state.items = [] })

vi.mock('@ionic/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return { ...actual, IonItem: (props: ComponentProps<typeof IonItem>) => {
    state.items.push(props)
    return <actual.IonItem {...props} />
  } }
})

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ replace: vi.fn() }),
  useLocation: () => ({ pathname: '/transactions' }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { isAdmin: state.admin },
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
  it.each([false, true])('places import after navigation and administration, admin=%s', admin => {
    state.admin = admin
    const markup = renderToStaticMarkup(<AppMenu />)
    expect(markup.indexOf('Главная')).toBeLessThan(markup.indexOf('Импорт Monefy'))
    expect(markup.indexOf('Теги')).toBeLessThan(markup.indexOf('Импорт Monefy'))
    if (admin) expect(markup.indexOf('Приглашения')).toBeLessThan(markup.indexOf('Импорт Monefy'))
    expect(markup.indexOf('Импорт Monefy')).toBeLessThan(markup.indexOf('Тема:'))
    expect(state.items.every(item => item.className?.includes('app-menu-item'))).toBe(true)
    expect(state.items[state.items.length - 1]?.className).toContain('app-menu-item--logout')
  })

  it('does not install the global swipe gesture that can leave iOS input blocked', () => {
    const markup = renderToStaticMarkup(<AppMenu />)

    expect(markup).toContain('swipe-gesture="false"')
    expect(markup).toContain('content-id="main-content"')
    expect(markup).toContain('side="start"')
  })
})
