import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'

import { AccountKindField, AccountKindHelp } from './AccountKindField'

const popovers = vi.hoisted(() => [] as ComponentProps<typeof import('@ionic/react').IonPopover>[])
vi.mock('@ionic/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ionic/react')>()
  return {
    ...actual,
    IonPopover: (props: ComponentProps<typeof actual.IonPopover>) => {
      popovers.push(props)
      return <actual.IonPopover {...props} />
    },
  }
})
afterEach(() => { popovers.length = 0 })

describe('AccountKindField', () => {
  it('anchors the help arrow to the accessible help button', () => {
    const markup = renderToStaticMarkup(<AccountKindField value="spending" />)
    const trigger = markup.match(/id="(account-kind-help-[^"]+)"/)?.[1]
    expect(trigger).toBeDefined()
    expect(popovers[0]).toMatchObject({ trigger, reference: 'trigger', side: 'bottom', alignment: 'center' })
  })

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
