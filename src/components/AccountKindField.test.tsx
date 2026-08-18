import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'

import { AccountKindField, AccountKindHelp } from './AccountKindField'

describe('AccountKindField', () => {
  it('renders short selector options and an accessible help trigger', () => {
    const markup = renderToStaticMarkup(
      <AccountKindField value="spending" onChange={vi.fn()} />,
    )

    expect(markup).toContain('aria-label="Что означают типы средств?"')
    expect(markup).toContain('Для текущих расходов')
    expect(markup).not.toContain(ACCOUNT_KIND_OPTIONS[0].description)
  })

  it('renders all descriptions inside the help content', () => {
    const markup = renderToStaticMarkup(<AccountKindHelp />)

    for (const option of ACCOUNT_KIND_OPTIONS) {
      expect(markup).toContain(option.label)
      expect(markup).toContain(option.description)
    }
  })
})
