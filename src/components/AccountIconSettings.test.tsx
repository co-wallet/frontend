import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { AccountIconSettings } from './AccountIconSettings'

describe('AccountIconSettings', () => {
  it('renders the icon controls in a collapsed-by-default accordion', () => {
    const markup = renderToStaticMarkup(
      <AccountIconSettings
        value="preset:cash|green|orange"
        onChange={vi.fn()}
        sessionKey="test-session"
      />,
    )

    expect(markup).toContain('<ion-accordion-group>')
    expect(markup).toContain('value="account-icon-settings"')
    expect(markup).toContain('class="account-icon-settings"')
    expect(markup).toContain('Иконка и оформление')
    expect(markup).not.toContain('Нажмите, чтобы выбрать и настроить')
    expect(markup).not.toContain('Цвет иконки и обводки настраиваются независимо')
  })
})
