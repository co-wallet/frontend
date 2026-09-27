import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { TransactionDescriptionInput } from './TransactionDescriptionInput'

describe('TransactionDescriptionInput', () => {
  it('requests sentence capitalization without changing the supplied value', () => {
    const markup = renderToStaticMarkup(
      <TransactionDescriptionInput value="ужин дома" onChange={vi.fn()} />,
    )

    expect(markup).toContain('autocapitalize="sentences"')
    expect(markup).toContain('value="ужин дома"')
  })
})
