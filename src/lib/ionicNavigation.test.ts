import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransitionOptions } from '@ionic/react'
import { ionicNavigationConfig, iosWebTransition } from './ionicNavigation'

const state = vi.hoisted(() => ({
  platforms: [] as string[],
  animation: { addElement: vi.fn().mockReturnThis(), duration: vi.fn().mockReturnThis() },
  iosTransition: vi.fn(() => 'ios-animation'),
}))

vi.mock('@ionic/react', () => ({
  isPlatform: (platform: string) => state.platforms.includes(platform),
  createAnimation: () => state.animation,
  iosTransitionAnimation: state.iosTransition,
}))

beforeEach(() => { state.platforms = []; vi.clearAllMocks() })

describe('iOS history navigation', () => {
  it.each([['ios', 'mobileweb'], ['ios', 'pwa']])('lets WebKit own edge navigation on %s %s', (...platforms) => {
    state.platforms = platforms
    expect(ionicNavigationConfig()).toEqual({ swipeBackEnabled: false, navAnimation: iosWebTransition })
  })

  it.each([['ios', 'hybrid'], ['android', 'mobileweb'], ['desktop']])('preserves Ionic navigation on %s', (...platforms) => {
    state.platforms = platforms
    expect(ionicNavigationConfig()).toEqual({ swipeBackEnabled: true })
  })

  it('completes a browser back transition without adding a second slide animation', () => {
    const base = {} as HTMLElement
    const entering = {} as HTMLElement
    iosWebTransition(base, { direction: 'back', enteringEl: entering } as TransitionOptions)
    expect(state.animation.addElement).toHaveBeenCalledWith(entering)
    expect(state.animation.duration).toHaveBeenCalledWith(0)
    expect(state.iosTransition).not.toHaveBeenCalled()
  })

  it('keeps the standard iOS animation for forward navigation', () => {
    const base = {} as HTMLElement
    const opts = { direction: 'forward' } as TransitionOptions
    iosWebTransition(base, opts)
    expect(state.iosTransition).toHaveBeenCalledWith(base, opts)
    expect(state.animation.duration).not.toHaveBeenCalled()
  })
})
