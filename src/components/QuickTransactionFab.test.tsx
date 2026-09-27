import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { QuickTransactionFab } from './QuickTransactionFab'

describe('QuickTransactionFab', () => {
  it('exposes three disabled quick actions until the menu is opened', () => {
    const markup = renderToStaticMarkup(<QuickTransactionFab onSelect={vi.fn()} />)

    expect(markup).toContain('aria-haspopup="menu"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('aria-label="Добавить расход"')
    expect(markup).toContain('data-transaction-type="expense"')
    expect(markup).toContain('aria-label="Добавить доход"')
    expect(markup).toContain('data-transaction-type="income"')
    expect(markup).toContain('aria-label="Добавить перевод"')
    expect(markup).toContain('data-transaction-type="transfer"')
    expect(markup.match(/disabled="true"/g)).toHaveLength(3)
  })
})
