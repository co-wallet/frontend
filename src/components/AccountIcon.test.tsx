import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  AccountIcon,
  AccountIconPicker,
  DEFAULT_ACCOUNT_ICON,
  MAX_CUSTOM_ACCOUNT_ICON_LENGTH,
  customAccountIconValue,
  normalizeAccountIconValue,
  updateAccountIconAppearance,
} from './AccountIcon'

describe('AccountIcon', () => {
  it('renders a preset as an accessible vector icon', () => {
    const markup = renderToStaticMarkup(<AccountIcon value="preset:piggy-bank" />)

    expect(markup).toContain('aria-label="Копилка"')
    expect(markup).toContain('<svg')
    expect(markup).not.toContain('🐷')
  })

  it('scales the frame radius with the icon size', () => {
    const compactMarkup = renderToStaticMarkup(
      <AccountIcon value="preset:cash" size={20} />,
    )
    const defaultMarkup = renderToStaticMarkup(
      <AccountIcon value="preset:cash" />,
    )

    expect(compactMarkup).toContain('--account-icon-border-radius:5px')
    expect(defaultMarkup).toContain('--account-icon-border-radius:12px')
  })

  it('renders a compact rectangular frame when requested', () => {
    const markup = renderToStaticMarkup(
      <AccountIcon value="custom:TBank" size={20} shape="rectangle" />,
    )

    expect(markup).toContain('account-icon--rectangle')
    expect(markup).toContain('width:34px')
    expect(markup).toContain('height:20px')
    expect(markup).toContain('--account-icon-border-radius:4px')
    expect(markup).toContain('font-size:8px')
  })

  it('renders custom text without exposing its storage prefix', () => {
    const markup = renderToStaticMarkup(<AccountIcon value="custom:TBank|green|purple" />)

    expect(markup).toContain('TBank')
    expect(markup).toContain('aria-label="Своя иконка: TBank"')
    expect(markup).toContain('--account-icon-foreground:var(--account-icon-color-green)')
    expect(markup).toContain('--account-icon-border:var(--account-icon-color-purple)')
    expect(markup).not.toContain('custom:TBank|green|purple')
  })

  it('maps old emoji values to the new preset collection', () => {
    expect(normalizeAccountIconValue('💵')).toBe('preset:cash')
    expect(normalizeAccountIconValue('📈')).toBe('preset:investments')
    expect(normalizeAccountIconValue('🚗')).toBe('preset:car')
    expect(normalizeAccountIconValue('✈️')).toBe('preset:travel')
  })

  it('trims custom text and limits it to the supported length', () => {
    const longLabel = 'VeryLongBankName'

    expect(normalizeAccountIconValue('custom: Alfa ')).toBe('custom:Alfa')
    expect(customAccountIconValue(longLabel)).toBe(
      `custom:${longLabel.slice(0, MAX_CUSTOM_ACCOUNT_ICON_LENGTH)}`,
    )
    expect(normalizeAccountIconValue('custom:   ')).toBe(DEFAULT_ACCOUNT_ICON)
  })

  it('updates foreground and border colors independently', () => {
    const purpleIcon = updateAccountIconAppearance('preset:cash', { foreground: 'purple' })
    const orangeBorder = updateAccountIconAppearance(purpleIcon, { border: 'orange' })

    expect(purpleIcon).toBe('preset:cash|purple|blue')
    expect(orangeBorder).toBe('preset:cash|purple|orange')
    expect(updateAccountIconAppearance(orangeBorder, { border: 'none' })).toBe(
      'preset:cash|purple|none',
    )
  })

  it('preserves appearance while normalizing a custom label within the database limit', () => {
    const normalized = normalizeAccountIconValue('custom: Alfa |yellow|graphite')

    expect(normalized).toBe('custom:Alfa|yellow|graphite')
    expect(normalized.length).toBeLessThanOrEqual(50)
  })

  it('migrates saved teal appearance values to yellow', () => {
    expect(normalizeAccountIconValue('preset:cash|teal|teal')).toBe(
      'preset:cash|yellow|yellow',
    )
  })

  it('uses a dedicated readable foreground for yellow while preserving its border color', () => {
    const markup = renderToStaticMarkup(
      <AccountIcon value="preset:cash|yellow|yellow" />,
    )

    expect(markup).toContain('--account-icon-foreground:var(--account-icon-foreground-yellow)')
    expect(markup).toContain('--account-icon-border:var(--account-icon-color-yellow)')
  })

  it('shows the effective yellow values in both appearance palettes', () => {
    const markup = renderToStaticMarkup(
      <AccountIconPicker
        value="preset:cash|yellow|yellow"
        onChange={vi.fn()}
      />,
    )

    expect(markup).toContain('--account-icon-swatch:var(--account-icon-foreground-yellow)')
    expect(markup).toContain('--account-icon-swatch:var(--account-icon-color-yellow)')
  })
})
