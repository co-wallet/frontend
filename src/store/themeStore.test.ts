import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('theme icons', () => {
  it('restores the saved theme and follows manual and system theme changes', async () => {
    let systemDark = false
    let onSystemChange = () => {}
    const attributes = new Map<string, string>()
    const storage = {
      getItem: () => JSON.stringify({ state: { mode: 'dark' }, version: 0 }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    vi.stubGlobal('document', {
      body: { classList: { toggle: vi.fn() } },
      querySelector: (selector: string) => ({
        setAttribute: (_name: string, value: string) => attributes.set(selector, value),
      }),
    })
    vi.stubGlobal('window', {
      localStorage: storage,
      matchMedia: () => ({
        get matches() { return systemDark },
        addEventListener: (_event: string, callback: () => void) => { onSystemChange = callback },
      }),
    })
    const { useThemeStore } = await import('./themeStore')
    const expectIcons = (dark: boolean) => {
      const prefix = dark ? '/icons/wallet-dark' : '/icons/wallet'
      expect(attributes.get('link[rel="icon"]')).toBe(`${prefix}-32.png`)
      expect(attributes.get('link[rel="apple-touch-icon"]')).toBe(`${prefix}-180.png`)
      expect(attributes.get('link[rel="manifest"]')).toBe(dark ? '/manifest-dark.webmanifest' : '/manifest.webmanifest')
      expect(attributes.get('meta[name="theme-color"]')).toBe(dark ? '#000000' : '#3b82f6')
    }
    expectIcons(true)
    useThemeStore.getState().setMode('light')
    expectIcons(false)
    systemDark = true
    onSystemChange()
    expectIcons(false)
    useThemeStore.getState().setMode('system')
    expectIcons(true)
    systemDark = false
    onSystemChange()
    expectIcons(false)
    useThemeStore.getState().setMode('dark')
    expectIcons(true)
  })
})
