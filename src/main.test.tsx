import { afterEach, expect, it, vi } from 'vitest'

const startup = vi.hoisted(() => ({
  setup: vi.fn(),
  render: vi.fn(),
}))

vi.mock('@ionic/react', () => ({
  IonApp: 'ion-app',
  setupIonicReact: startup.setup,
}))
vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: startup.render }),
}))
vi.mock('./App', () => ({ default: () => null }))
vi.mock('./store/themeStore', () => ({}))

afterEach(() => { vi.unstubAllGlobals() })

it('enables page focus management before mounting the router while preserving swipe back', async () => {
  vi.stubGlobal('document', { getElementById: () => ({}) })

  await import('./main')

  expect(startup.setup).toHaveBeenCalledWith(expect.objectContaining({
    swipeBackEnabled: true,
    focusManagerPriority: ['content'],
  }))
  expect(startup.render).toHaveBeenCalledOnce()
  expect(startup.setup.mock.invocationCallOrder[0]).toBeLessThan(startup.render.mock.invocationCallOrder[0])
})
