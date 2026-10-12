import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]

function startPage({
  stored = null as string | null,
  systemDark = false,
  storageDenied = false,
  userAgent = 'iPhone',
  platform = 'iPhone',
  maxTouchPoints = 1,
  standalone = true,
  displayStandalone = false,
} = {}) {
  const root = { dataset: { theme: '' }, classList: { toggle: vi.fn() } }
  const themeColor = { content: '#1d4ed8' }
  const getItem = vi.fn(() => {
    if (storageDenied) throw new Error('Storage access denied')
    return stored
  })
  expect(bootstrap).toBeDefined()
  // No body or React exists yet. Execute the actual blocking HTML script.
  runInNewContext(bootstrap!, {
    document: {
      documentElement: root,
      querySelector: (selector: string) => {
        expect(selector).toBe('meta[name="theme-color"]')
        return themeColor
      },
    },
    localStorage: { getItem },
    navigator: { userAgent, platform, maxTouchPoints, standalone },
    matchMedia: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? systemDark : displayStandalone,
    }),
  })
  expect(getItem).toHaveBeenCalledWith('theme-preference')
  return { root, themeColor }
}

describe('theme before the application loads', () => {
  it.each([
    { mode: 'light', systemDark: true, dark: false },
    { mode: 'dark', systemDark: false, dark: true },
    { mode: 'system', systemDark: true, dark: true },
    { mode: 'system', systemDark: false, dark: false },
  ])('restores $mode with system dark=$systemDark before body/React exist', ({ mode, systemDark, dark }) => {
    const { root, themeColor } = startPage({
      stored: JSON.stringify({ state: { mode }, version: 0 }), systemDark,
    })
    expect(root.dataset.theme).toBe(dark ? 'dark' : 'light')
    expect(themeColor.content).toBe(dark ? '#16213e' : '#1d4ed8')
  })

  it.each([
    { stored: null },
    { stored: '{invalid' },
    { stored: '{}' },
    { stored: '{"state":{"mode":"invalid"}}' },
    { storageDenied: true },
  ])('falls back to the system theme with missing, invalid or inaccessible storage: %j', (options) => {
    const { root, themeColor } = startPage({ ...options, systemDark: true })
    expect(root.dataset.theme).toBe('dark')
    expect(themeColor.content).toBe('#16213e')
  })

  it('keeps the bootstrap in head before any deferred application code', () => {
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</head>'))
    expect(html.indexOf('<style>')).toBeLessThan(html.indexOf('<script>'))
    expect(html.indexOf('id="app-status-bar"')).toBeLessThan(html.indexOf('id="root"'))
    expect(html).toContain('id="app-status-bar" aria-hidden="true"')
  })
})

describe('early iOS standalone detection', () => {
  it.each([
    { options: {}, expected: true },
    { options: { standalone: false, displayStandalone: true }, expected: true },
    { options: { standalone: false }, expected: false },
    { options: { userAgent: 'Android', platform: 'Linux' }, expected: false },
    { options: { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 }, expected: true },
    { options: { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 }, expected: false },
  ])('paints only an iOS standalone page: %j', ({ options, expected }) => {
    expect(startPage(options).root.classList.toggle)
      .toHaveBeenCalledWith('app-ios-standalone', expected)
  })
})
