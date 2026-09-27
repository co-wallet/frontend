import type { PieProps } from 'recharts'

export const NON_ANIMATED_PIE_PROPS = {
  isAnimationActive: false,
} as const satisfies Pick<PieProps, 'isAnimationActive'>
