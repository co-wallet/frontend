import { expect, it } from 'vitest'
import { NON_ANIMATED_PIE_PROPS } from './chartMotion'

it('keeps pie charts free from JavaScript tween animation', () => {
  expect(NON_ANIMATED_PIE_PROPS).toEqual({ isAnimationActive: false })
})
