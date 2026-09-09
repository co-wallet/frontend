import { renderToStaticMarkup } from 'react-dom/server'
import { IonButton, IonToolbar } from '@ionic/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('places back navigation on the left and the menu on the right', () => {
    const html = renderToStaticMarkup(<PageHeader title="Счета" />)
    expect(html).toMatch(/slot="start"><ion-back-button default-href="\/dashboard"/)
    expect(html).toMatch(/<ion-title>Счета<\/ion-title><ion-buttons slot="end"><ion-menu-button/)
  })

  it.each(['/accounts', '/transactions', '/admin'])('uses %s as the parent when opened directly', (backHref) => {
    const html = renderToStaticMarkup(<PageHeader title="Раздел" backHref={backHref} />)
    expect(html).toContain(`default-href="${backHref}"`)
    expect(html).toContain('text="Назад"')
  })

  it('hides back only on the dashboard and keeps actions before the menu', () => {
    const html = renderToStaticMarkup(
      <PageHeader title="co-wallet" backHref={false} actions={<IonButton>Валюта</IonButton>} />,
    )
    expect(html).not.toContain('ion-back-button')
    expect(html).not.toContain('slot="start"')
    expect(html).toContain('text-align:start;padding-inline:20px')
    expect(html).toMatch(/slot="end">[^]*Валюта[^]*<ion-menu-button aria-label="Главное меню"/)
  })

  it('preserves a secondary toolbar for page controls', () => {
    const html = renderToStaticMarkup(<PageHeader title="Категории"><IonToolbar>Расходы и доходы</IonToolbar></PageHeader>)
    expect(html).toContain('</ion-toolbar><ion-toolbar>Расходы и доходы</ion-toolbar>')
  })
})
