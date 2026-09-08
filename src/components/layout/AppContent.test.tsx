import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IonFab, IonFabButton } from '@ionic/react'
import { AppContent } from './AppContent'

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
    expect(markup).not.toContain('app-content--with-fab')
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
    expect(markup).toMatch(/<div class="app-content-body"><p>Последняя строка<\/p><\/div><ion-fab[^>]*slot="fixed"/)
  })
})
