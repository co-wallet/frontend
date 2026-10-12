import { useEffect, useRef } from 'react'

/** Prevent the anchor's default navigation even when a sensor stops click propagation. */
export function useDragClickGuard() {
  const ref = useRef<HTMLDivElement | null>(null)
  const suppress = useRef(false)
  useEffect(() => {
    const blockClick = (event: MouseEvent) => {
      if (!suppress.current || !ref.current || !event.composedPath().includes(ref.current)) return
      event.preventDefault()
      event.stopPropagation()
      suppress.current = false
    }
    document.addEventListener('click', blockClick, true)
    return () => document.removeEventListener('click', blockClick, true)
  }, [])
  return { ref, suppress, reset: () => { suppress.current = false } }
}
