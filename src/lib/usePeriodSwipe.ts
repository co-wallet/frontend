import { useEffect, useRef } from 'react'
import { createGesture, type GestureDetail } from '@ionic/react'
import type { TransactionPeriod } from './transactionNavigation'
import { shiftPeriod } from './periodNavigation'

/** Attach period navigation to the content, leaving headers and edge-back gestures alone. */
export function usePeriodSwipe(
  value: TransactionPeriod,
  onChange: (value: Partial<TransactionPeriod>) => void,
  enabled: boolean,
) {
  const ref = useRef<HTMLIonContentElement>(null)
  const latest = useRef({ value, onChange, enabled })
  latest.current = { value, onChange, enabled }

  useEffect(() => {
    const content = ref.current
    if (!content) return
    let cancelled = false
    let suppressClick = false
    let clickTimer: ReturnType<typeof setTimeout> | undefined

    function clearClickSuppression() {
      suppressClick = false
      clearTimeout(clickTimer)
    }

    function blockSwipeClick(event: MouseEvent) {
      if (!suppressClick) return
      event.preventDefault()
      event.stopPropagation()
      clearClickSuppression()
    }

    function hasMultipleTouches(detail: GestureDetail) {
      const event = detail.event as TouchEvent
      return event.touches !== undefined && event.touches.length > 1
    }

    const gesture = createGesture({
      el: content,
      gestureName: 'transaction-period',
      gesturePriority: 90,
      direction: 'x',
      threshold: 16,
      maxAngle: 25,
      passive: false,
      canStart: (detail) => {
        clearClickSuppression()
        cancelled = false
        if (!latest.current.enabled || hasMultipleTouches(detail)) return false
        // Reserve both screen edges for platform/browser navigation.
        if (detail.startX < 32 || detail.startX > window.innerWidth - 32) return false
        const target = detail.event.target as Element
        if (target.closest('ion-fab, ion-modal, ion-popover, ion-item-sliding, .ion-page-hidden')) return false
        const control = target.closest('button, a, input, select, textarea, ion-button, ion-router-link, ion-select, ion-segment, ion-checkbox, ion-toggle, ion-range, [role="button"]')
        return !control || control.classList.contains('transaction-item__open')
      },
      onStart: (detail) => {
        suppressClick = true
        if (detail.event.cancelable) detail.event.preventDefault()
      },
      onMove: (detail) => {
        if (hasMultipleTouches(detail)) cancelled = true
        if (detail.event.cancelable) detail.event.preventDefault()
      },
      onEnd: (detail) => {
        clickTimer = setTimeout(clearClickSuppression, 400)
        if (cancelled || !latest.current.enabled || detail.event.type === 'touchcancel' ||
          Math.abs(detail.deltaX) < 64 || Math.abs(detail.deltaX) < Math.abs(detail.deltaY) * 2) return
        const next = shiftPeriod(latest.current.value, detail.deltaX < 0 ? 1 : -1)
        if (next) latest.current.onChange(next)
      },
    })
    content.addEventListener('click', blockSwipeClick, true)
    gesture.enable()
    return () => {
      gesture.destroy()
      content.removeEventListener('click', blockSwipeClick, true)
      clearClickSuppression()
    }
  }, [])

  return ref
}
