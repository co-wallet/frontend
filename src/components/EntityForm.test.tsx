import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { IonButton } from '@ionic/react'
import { describe, expect, it, vi } from 'vitest'
import { EntityFormError, EntityFormHeader, EntityFormPicker, EntityFormSelect } from './EntityForm'

function buttons(node: ReactNode): ReactElement[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return []
    return child.type === IonButton ? [child] : buttons(child.props.children)
  })
}

describe('EntityFormHeader', () => {
  it('keeps cancel and submit as separate actions in the toolbar', () => {
    const onCancel = vi.fn()
    const onSubmit = vi.fn()
    const header = EntityFormHeader({ title: 'Новый тег', onCancel, onSubmit })
    const [cancel, save] = buttons(header)

    cancel.props.onClick()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
    save.props.onClick()
    expect(onSubmit).toHaveBeenCalledOnce()
    const markup = renderToStaticMarkup(header)
    expect(markup).toMatch(/slot="start"[^]*Отмена[^]*Новый тег[^]*slot="end"[^]*Сохранить/)
  })

  it.each([
    { pending: false, disabled: false, expected: false },
    { pending: false, disabled: true, expected: true },
    { pending: true, disabled: false, expected: true },
    { pending: true, disabled: true, expected: true },
  ])('prevents submission while invalid or pending: %o', ({ pending, disabled, expected }) => {
    const header = EntityFormHeader({ title: 'Новая категория', onCancel: vi.fn(), onSubmit: vi.fn(), pending, disabled })
    const [cancel, save] = buttons(header)
    expect(save.props.disabled).toBe(expected)
    expect(cancel.props.disabled).toBeUndefined()
    const markup = renderToStaticMarkup(header)
    expect(markup.includes('<ion-spinner')).toBe(pending)
    expect(markup).toContain('aria-label="Сохранить"')
  })
})

it('uses an action sheet with a Russian cancel action and forwards selection changes', () => {
  const onIonChange = vi.fn()
  const select = EntityFormSelect({ label: 'Тип', value: 'income', onIonChange })
  expect(select.props).toMatchObject({ label: 'Тип', value: 'income', labelPlacement: 'fixed', interface: 'action-sheet', cancelText: 'Отмена' })
  select.props.onIonChange({ detail: { value: 'expense' } })
  expect(onIonChange).toHaveBeenCalledWith({ detail: { value: 'expense' } })
})

it('opens a rich picker without changing its selected value', () => {
  const onOpen = vi.fn()
  const picker = EntityFormPicker({ label: 'Счёт', value: 'Карта · RUB', accessibleValue: 'Карта', isOpen: false, onOpen })
  picker.props.onClick()
  expect(onOpen).toHaveBeenCalledOnce()
  expect(picker.props['aria-expanded']).toBe(false)
  expect(picker.props['aria-label']).toBe('Счёт: Карта')
  const markup = renderToStaticMarkup(picker)
  expect(markup).toContain('Карта · RUB')
  expect(markup).toContain('aria-haspopup="dialog"')
})

it('announces an API error and removes the alert when cleared', () => {
  expect(renderToStaticMarkup(<EntityFormError>Не удалось сохранить</EntityFormError>)).toContain('role="alert"')
  expect(renderToStaticMarkup(<EntityFormError />)).toBe('')
})
