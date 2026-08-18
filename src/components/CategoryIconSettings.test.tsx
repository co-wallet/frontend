import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { CategoryIconSettings } from './CategoryIconSettings'

describe('CategoryIconSettings', () => {
  it('renders category icon controls in a collapsed-by-default accordion', () => {
    const markup = renderToStaticMarkup(
      <CategoryIconSettings
        value="preset:groceries"
        type="expense"
        onChange={vi.fn()}
        sessionKey="new-expense"
      />,
    )

    expect(markup).toContain('value="category-icon-settings"')
    expect(markup).toContain('class="account-icon-settings"')
    expect(markup).toContain('Иконка и оформление')
  })
})
