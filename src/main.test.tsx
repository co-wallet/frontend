import { afterEach, expect, it, vi } from 'vitest'

const startup = vi.hoisted(() => ({
  setup: vi.fn(),
  render: vi.fn(),
  ios: false,
}))

vi.mock('@ionic/react', () => ({
  IonApp: 'ion-app',
  setupIonicReact: startup.setup,
  isPlatform: (platform: string) => platform === 'ios' && startup.ios,
}))
vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: startup.render }),
}))
vi.mock('./App', () => ({ default: () => null }))
vi.mock('./store/themeStore', () => ({}))

afterEach(() => { vi.unstubAllGlobals() })

it.each([false, true])('configures platform navigation before mounting the router, ios=%s', async ios => {
  vi.resetModules()
  vi.clearAllMocks()
  startup.ios = ios
  vi.stubGlobal('document', { getElementById: () => ({}) })

  await import('./main')

  expect(startup.setup).toHaveBeenCalledWith(expect.objectContaining({
    swipeBackEnabled: !ios,
    focusManagerPriority: ['content'],
  }))
  expect(startup.render).toHaveBeenCalledOnce()
  expect(startup.setup.mock.invocationCallOrder[0]).toBeLessThan(startup.render.mock.invocationCallOrder[0])
})
