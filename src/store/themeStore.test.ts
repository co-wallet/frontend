import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('theme icons and system chrome', () => {
  it.each([
    { saved: 'dark', initialSystemDark: false, initialDark: true },
    { saved: 'light', initialSystemDark: true, initialDark: false },
    { saved: 'system', initialSystemDark: true, initialDark: true },
    { saved: undefined, initialSystemDark: false, initialDark: false },
    { saved: undefined, initialSystemDark: true, initialDark: true },
  ])('restores $saved with system dark=$initialSystemDark and follows theme changes', async ({ saved, initialSystemDark, initialDark }) => {
    let systemDark = initialSystemDark
    let onSystemChange = () => {}
    const attributes = new Map<string, string>()
    const toggle = vi.fn()
    const storage = {
      getItem: () => saved ? JSON.stringify({ state: { mode: saved }, version: 0 }) : null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    vi.stubGlobal('document', {
      body: { classList: { toggle } },
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
      expect(toggle).toHaveBeenLastCalledWith('dark', dark)
      const prefix = dark ? '/icons/wallet-dark' : '/icons/wallet'
      expect(attributes.get('link[rel="icon"]')).toBe(`${prefix}-32.png`)
      expect(attributes.get('link[rel="apple-touch-icon"]')).toBe(`${prefix}-180.png`)
      expect(attributes.get('link[rel="manifest"]')).toBe(dark ? '/manifest-dark.webmanifest' : '/manifest.webmanifest')
      expect(attributes.get('meta[name="theme-color"]')).toBe(dark ? '#16213e' : '#1d4ed8')
      // Changing this at runtime cannot reliably change the installed iOS status bar.
      expect(attributes.has('meta[name="apple-mobile-web-app-status-bar-style"]')).toBe(false)
    }
    expectIcons(initialDark)
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
    systemDark = true
    onSystemChange()
    expectIcons(true)
    systemDark = false
    onSystemChange()
    expectIcons(true)
    expect(storage.setItem).toHaveBeenLastCalledWith(
      'theme-preference', JSON.stringify({ state: { mode: 'dark' }, version: 0 }),
    )
  })

  it('applies the theme when optional head elements are absent', async () => {
    const toggle = vi.fn()
    vi.stubGlobal('document', {
      body: { classList: { toggle } },
      querySelector: () => null,
    })
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false, addEventListener: vi.fn() }),
      localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
    })
    const { useThemeStore } = await import('./themeStore')
    useThemeStore.getState().setMode('dark')
    expect(toggle).toHaveBeenLastCalledWith('dark', true)
  })
})
