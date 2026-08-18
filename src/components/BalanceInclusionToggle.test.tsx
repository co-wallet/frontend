import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  BalanceInclusionToggle,
  GENERAL_BALANCE_HELP,
  GeneralBalanceHelp,
} from './BalanceInclusionToggle'

describe('BalanceInclusionToggle', () => {
  it('renders an accessible help trigger and explanation', () => {
    const markup = renderToStaticMarkup(
      <BalanceInclusionToggle checked onChange={vi.fn()} />,
    )

    expect(markup).toContain('aria-label="Что такое общий баланс?"')
    expect(markup).toContain('Учитывать в общем балансе')
  })

  it('renders the explanation shown in the popover', () => {
    const markup = renderToStaticMarkup(<GeneralBalanceHelp />)

    expect(markup).toContain('<h2>Общий баланс</h2>')
    expect(markup).toContain(GENERAL_BALANCE_HELP)
  })
})
