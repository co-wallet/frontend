import { useSyncExternalStore } from 'react'

const TAP_QUERY = '(hover: none), (pointer: coarse)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(TAP_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(TAP_QUERY).matches
}

export function useChartTooltipTrigger(): 'click' | 'hover' {
  const useTap = useSyncExternalStore(subscribe, getSnapshot, () => false)
  return useTap ? 'click' : 'hover'
}
