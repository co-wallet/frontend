import { Children, type ReactElement } from 'react'
import { IonContent, IonModal } from '@ionic/react'
import { describe, expect, it, vi } from 'vitest'

import { EntitySelectModal } from './EntitySelectModal'

describe('EntitySelectModal', () => {
  it('uses one regular modal contract for every entity selector', () => {
    const onDismiss = vi.fn()
    const modal = EntitySelectModal({
      title: 'Выбор',
      isOpen: true,
      onDismiss,
      children: <div>Последний пункт</div>,
    })

    expect(modal.type).toBe(IonModal)
    expect(modal.props).toMatchObject({
      className: 'entity-select-modal',
      isOpen: true,
      onDidDismiss: onDismiss,
    })
    expect(modal.props).not.toHaveProperty('initialBreakpoint')
    expect(modal.props).not.toHaveProperty('breakpoints')
    expect(modal.props).not.toHaveProperty('expandToScroll')
    expect(modal.props).not.toHaveProperty('handleBehavior')

    const content = Children.toArray(modal.props.children)[1] as ReactElement
    expect(content.type).toBe(IonContent)
    expect(content.props.className).toBe('entity-select-modal__content')
  })
})
