import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(new URL('./variables.css', import.meta.url), 'utf8')

function declarations(selector: string): Record<string, string> {
  const block = stylesheet.slice(stylesheet.indexOf(`${selector} {`)).split('}')[0]
  return Object.fromEntries(Array.from(block.matchAll(/(--[\w-]+):\s*([^;]+);/g),
    ([, name, value]) => [name, value.trim()]))
}

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe.each(['light', 'dark'] as const)('%s theme contrast', (theme) => {
  const palette = {
    ...declarations(':root'),
    ...(theme === 'dark' ? declarations('body.dark') : {}),
  }
  const surfaces = theme === 'dark'
    ? [palette['--ion-background-color'], palette['--ion-card-background'], '#202238']
    : [palette['--ion-background-color']]

  it.each([
    '--ion-text-color',
    '--ion-text-color-step-150',
    '--ion-text-color-step-300',
    '--transaction-secondary-text',
    '--transaction-tag-text',
    '--transaction-expense-text',
    '--transaction-income-text',
    '--transaction-transfer-text',
    '--ion-color-medium',
    '--ion-color-medium-shade',
    '--ion-color-primary',
    '--ion-color-danger',
    '--ion-color-success',
  ])('keeps %s readable as small text on page and card surfaces', (token) => {
    for (const surface of surfaces) {
      expect(contrast(palette[token], surface), `${token} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(['primary', 'danger', 'success'])('keeps text readable on filled %s controls', (color) => {
    expect(contrast(palette[`--ion-color-${color}-contrast`], palette[`--ion-color-${color}`]))
      .toBeGreaterThanOrEqual(4.5)
  })
})
