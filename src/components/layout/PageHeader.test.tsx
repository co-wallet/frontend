import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { IonButton, IonToolbar } from '@ionic/react'
import { describe, expect, it, vi } from 'vitest'
import { PageHeader } from './PageHeader'

const state = vi.hoisted(() => ({
  toolbar: undefined as ComponentProps<typeof IonToolbar> | undefined,
}))
vi.mock('@ionic/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonToolbar: (props: ComponentProps<typeof IonToolbar>) => {
      state.toolbar = props
      return <actual.IonToolbar {...props} />
    },
  }
})
describe('PageHeader', () => {
  it('places the menu on the left and leaves extra actions on the right', () => {
    const html = renderToStaticMarkup(<PageHeader title="Счета" actions={<IonButton>Обновить</IonButton>} />)
    expect(html).toMatch(/slot="start"><ion-menu-button[^>]*aria-label="Главное меню"/)
    expect(html).toMatch(/<ion-title>Счета<\/ion-title><ion-buttons slot="end">[^]*Обновить/)
    expect(html).not.toContain('ion-back-button')
  })

  it('leaves back gestures to the existing Ionic router', () => {
    renderToStaticMarkup(<PageHeader title="Счета" />)
    expect(state.toolbar?.onTouchStart).toBeUndefined()
    expect(state.toolbar?.onTouchMove).toBeUndefined()
    expect(state.toolbar?.onTouchEnd).toBeUndefined()
    expect(state.toolbar?.onTouchCancel).toBeUndefined()
  })

  it('preserves secondary controls', () => {
    const html = renderToStaticMarkup(<PageHeader title="Категории"><IonToolbar>Расходы и доходы</IonToolbar></PageHeader>)
    expect(html).toContain('</ion-toolbar><ion-toolbar>Расходы и доходы</ion-toolbar>')
  })
})
