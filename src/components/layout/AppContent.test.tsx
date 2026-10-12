import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { IonContent, IonFab, IonFabButton } from '@ionic/react'
import { AppContent } from './AppContent'

const state = vi.hoisted(() => ({ content: undefined as ComponentProps<typeof IonContent> | undefined }))
vi.mock('@ionic/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return { ...actual, IonContent: (props: ComponentProps<typeof IonContent>) => {
    state.content = props
    return <actual.IonContent {...props} />
  } }
})

describe('AppContent', () => {
  it('preserves Ionic scrolling and accessibility props', () => {
    const markup = renderToStaticMarkup(
      <AppContent fullscreen scrollY={false} className="custom-content" aria-label="Счета">
        <p>Содержимое</p>
      </AppContent>,
    )

    expect(markup).toContain('fullscreen="true"')
    expect(markup).toContain('scroll-y="false"')
    expect(markup).toContain('aria-label="Счета"')
    expect(markup).toContain('<p>Содержимое</p>')
    expect(state.content?.className).not.toContain('app-content--with-fab')
    expect(state.content?.className).toContain('custom-content')
  })

  it('keeps the FAB in the fixed slot without a scrolling wrapper', () => {
    const markup = renderToStaticMarkup(
      <AppContent withFab fixed={
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label="Добавить" />
        </IonFab>
      }><p>Последняя строка</p></AppContent>,
    )

    expect(markup).not.toContain('withFab')
    expect(state.content?.fixedSlotPlacement).toBe('after')
    expect(markup).toContain('fixed-slot-placement="after"')
    expect(markup).toMatch(/<div class="app-content-body"><p>Последняя строка<\/p><\/div><ion-fab[^>]*slot="fixed"/)
  })

  it('always provides a valid fixed-slot placement and preserves an explicit choice', () => {
    renderToStaticMarkup(<AppContent />)
    expect(state.content?.fixedSlotPlacement).toBe('after')
    renderToStaticMarkup(<AppContent fixedSlotPlacement="before" />)
    expect(state.content?.fixedSlotPlacement).toBe('before')
  })

  it('reserves space for back navigation and places it before content for keyboard access', () => {
    const markup = renderToStaticMarkup(<AppContent backHref="/accounts"><p>Последняя строка</p></AppContent>)
    expect(state.content?.className).toContain('app-content--with-fab')
    expect(markup).toContain('fixed-slot-placement="before"')
    expect(markup).not.toContain('backHref')
    expect(markup).toMatch(/<ion-fab[^>]*slot="fixed"[^>]*horizontal="start"[^]*<\/ion-fab><div class="app-content-body">/)
    expect(markup).toContain('aria-label="Назад"')
  })
})
