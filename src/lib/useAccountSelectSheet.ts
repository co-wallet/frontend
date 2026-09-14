import { useSyncExternalStore } from 'react'

const SHEET_QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(SHEET_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(SHEET_QUERY).matches
}

export function useAccountSelectSheet(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
