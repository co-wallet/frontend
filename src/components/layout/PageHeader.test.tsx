import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps, TouchEvent } from 'react'
import { IonButton, IonToolbar } from '@ionic/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageHeader } from './PageHeader'

const state = vi.hoisted(() => ({
  toolbar: undefined as ComponentProps<typeof IonToolbar> | undefined,
  canGoBack: vi.fn(() => true), goBack: vi.fn(), push: vi.fn(),
}))
vi.mock('@ionic/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    useIonRouter: () => state,
    IonToolbar: (props: ComponentProps<typeof IonToolbar>) => {
      if (props.className === 'page-header-toolbar') state.toolbar = props
      return <actual.IonToolbar {...props} />
    },
  }
})
beforeEach(() => { vi.clearAllMocks(); state.canGoBack.mockReturnValue(true) })

function touch(x: number, y: number, blocked = false, count = 1) {
  return {
    target: { closest: () => blocked ? {} : null },
    touches: Array.from({ length: count }, () => ({ clientX: x, clientY: y })),
    changedTouches: [{ clientX: x, clientY: y }],
  } as unknown as TouchEvent<HTMLIonToolbarElement>
}
function swipe(dx = -100, dy = 0) {
  state.toolbar!.onTouchStart!(touch(180, 20))
  const end = touch(180 + dx, 20 + dy, false, 0)
  state.toolbar!.onTouchEnd!(end)
}

describe('PageHeader', () => {
  it('places the menu on the left and leaves extra actions on the right', () => {
    const html = renderToStaticMarkup(<PageHeader title="Счета" actions={<IonButton>Обновить</IonButton>} />)
    expect(html).toMatch(/slot="start"><ion-menu-button[^>]*aria-label="Главное меню"/)
    expect(html).toMatch(/<ion-title>Счета<\/ion-title><ion-buttons slot="end">[^]*Обновить/)
    expect(html).not.toContain('ion-back-button')
  })

  it.each(['/accounts', '/transactions', '/admin'])('uses %s when swiping a directly opened page', backHref => {
    state.canGoBack.mockReturnValue(false)
    renderToStaticMarkup(<PageHeader title="Раздел" backHref={backHref} />)
    swipe()
    expect(state.push).toHaveBeenCalledWith(backHref, 'back', 'replace')
    expect(state.goBack).not.toHaveBeenCalled()
  })

  it('uses the existing Ionic history and accepts only one return per gesture', () => {
    renderToStaticMarkup(<PageHeader title="Счета" />)
    swipe()
    state.toolbar!.onTouchEnd!(touch(80, 20, false, 0))
    expect(state.goBack).toHaveBeenCalledTimes(1)
    expect(state.push).not.toHaveBeenCalled()
  })

  it.each([[100, 0], [-30, 0], [-100, 80], [0, 100]])('ignores dx=%s dy=%s', (dx, dy) => {
    renderToStaticMarkup(<PageHeader title="Счета" />)
    swipe(dx, dy)
    expect(state.goBack).not.toHaveBeenCalled()
  })

  it('ignores the dashboard, controls, hidden pages, multiple touches and cancelled gestures', () => {
    renderToStaticMarkup(<PageHeader title="co-wallet" backHref={false} />)
    swipe()
    expect(state.goBack).not.toHaveBeenCalled()
    renderToStaticMarkup(<PageHeader title="Счета" />)
    for (const start of [touch(180, 20, true), touch(180, 20, false, 2)]) {
      state.toolbar!.onTouchStart!(start)
      state.toolbar!.onTouchEnd!(touch(80, 20, false, 0))
    }
    state.toolbar!.onTouchStart!(touch(180, 20))
    state.toolbar!.onTouchMove!(touch(180, 20, false, 2))
    state.toolbar!.onTouchEnd!(touch(80, 20, false, 0))
    state.toolbar!.onTouchStart!(touch(180, 20))
    state.toolbar!.onTouchCancel!(touch(180, 20))
    state.toolbar!.onTouchEnd!(touch(80, 20, false, 0))
    expect(state.goBack).not.toHaveBeenCalled()
    expect(state.push).not.toHaveBeenCalled()
  })

  it('preserves secondary controls outside the swipe area', () => {
    const html = renderToStaticMarkup(<PageHeader title="Категории"><IonToolbar>Расходы и доходы</IonToolbar></PageHeader>)
    expect(html).toContain('</ion-toolbar><ion-toolbar>Расходы и доходы</ion-toolbar>')
  })
})
