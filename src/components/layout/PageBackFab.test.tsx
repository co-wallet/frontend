import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps, MouseEvent } from 'react'
import { IonFabButton } from '@ionic/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageBackFab } from './PageBackFab'

const state = vi.hoisted(() => ({
  click: undefined as ComponentProps<typeof IonFabButton>['onClick'],
  canGoBack: vi.fn(() => true), goBack: vi.fn(), push: vi.fn(),
}))
vi.mock('@ionic/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return { ...actual, useIonRouter: () => state,
    IonFabButton: (props: ComponentProps<typeof IonFabButton>) => {
      state.click = props.onClick
      return <actual.IonFabButton {...props} />
    },
  }
})
beforeEach(() => { vi.clearAllMocks(); state.canGoBack.mockReturnValue(true) })

describe('PageBackFab', () => {
  it('provides a labelled fixed bottom-left button and uses Ionic history', () => {
    const html = renderToStaticMarkup(<PageBackFab backHref="/accounts" />)
    expect(html).toContain('slot="fixed" vertical="bottom" horizontal="start"')
    expect(html).toContain('aria-label="Назад"')
    state.click!({} as MouseEvent<HTMLIonFabButtonElement>)
    expect(state.goBack).toHaveBeenCalledOnce()
    expect(state.push).not.toHaveBeenCalled()
  })

  it.each(['/dashboard', '/accounts', '/transactions', '/admin'])('returns direct links to %s', backHref => {
    state.canGoBack.mockReturnValue(false)
    renderToStaticMarkup(<PageBackFab backHref={backHref} />)
    state.click!({} as MouseEvent<HTMLIonFabButtonElement>)
    expect(state.push).toHaveBeenCalledWith(backHref, 'back', 'replace')
    expect(state.goBack).not.toHaveBeenCalled()
  })
})
