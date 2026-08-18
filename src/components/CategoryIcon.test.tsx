import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  CategoryIcon,
  CategoryIconPicker,
  defaultCategoryIconValue,
  normalizeCategoryIconValue,
  updateCategoryIconAppearance,
} from './CategoryIcon'

describe('CategoryIcon', () => {
  it('renders a category preset with the same frame and color mechanism as account icons', () => {
    const markup = renderToStaticMarkup(
      <CategoryIcon value="preset:groceries|green|orange" />,
    )

    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Продукты"')
    expect(markup).toContain('--account-icon-foreground:var(--account-icon-color-green)')
    expect(markup).toContain('--account-icon-border:var(--account-icon-color-orange)')
  })

  it('normalizes legacy emoji icons to vector presets', () => {
    expect(normalizeCategoryIconValue('🛒', 'expense')).toBe('preset:groceries')
    expect(normalizeCategoryIconValue('💼', 'income')).toBe('preset:work')
    expect(normalizeCategoryIconValue('🎁', 'income')).toBe('preset:gift-income')
  })

  it('provides category-type defaults and normalizes missing values', () => {
    expect(defaultCategoryIconValue('expense')).toBe('preset:groceries')
    expect(defaultCategoryIconValue('income')).toBe('preset:work')
    expect(normalizeCategoryIconValue(null, 'income')).toBe('preset:work')
  })

  it('updates foreground and border colors without changing the preset', () => {
    const purpleIcon = updateCategoryIconAppearance('preset:cafe', { foreground: 'purple' })
    const borderlessIcon = updateCategoryIconAppearance(purpleIcon, { border: 'none' })

    expect(purpleIcon).toBe('preset:cafe|purple|blue')
    expect(borderlessIcon).toBe('preset:cafe|purple|none')
  })

  it('shows only presets for the selected category type and has no custom icon control', () => {
    const markup = renderToStaticMarkup(
      <CategoryIconPicker
        value="preset:groceries"
        type="expense"
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('Иконка категории')
    expect(markup).toContain('Иконка «Продукты»')
    expect(markup).toContain('title="Продукты"')
    expect(markup).not.toContain('<span>Продукты</span>')
    expect(markup).not.toContain('Иконка «Работа»')
    expect(markup).not.toContain('Своя')
    expect(markup).toContain('Цвет иконки')
    expect(markup).toContain('Цвет обводки')
  })

  it('includes the extended screenshot-inspired presets in the correct category tabs', () => {
    const expenseMarkup = renderToStaticMarkup(
      <CategoryIconPicker
        value="preset:tax"
        type="expense"
        onChange={vi.fn()}
      />,
    )
    const incomeMarkup = renderToStaticMarkup(
      <CategoryIconPicker
        value="preset:cashback"
        type="income"
        onChange={vi.fn()}
      />,
    )

    for (const label of [
      'Налог',
      'Родители',
      'Подписки',
      'Психология',
      'Первая помощь',
      'Телефон',
      'Костёр',
      'Стиральная машина',
      'Бытовая химия',
      'Возврат долга',
      'Курение',
      'Бег',
      'Очки',
    ]) {
      expect(expenseMarkup).toContain(`Иконка «${label}»`)
    }

    for (const label of [
      'Долги',
      'Кэшбэк',
      'Проценты',
      'Процентная ставка',
      'Люди',
      'Возврат долга',
      'Очки',
      'Монеты',
    ]) {
      expect(incomeMarkup).toContain(`Иконка «${label}»`)
    }
  })
})
