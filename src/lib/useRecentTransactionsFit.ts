import { useEffect, useRef, useState } from 'react'
import { fitRecentTransactions } from './fitRecentTransactions'

export function useRecentTransactionsFit(contentKey: unknown, status: string) {
  const ref = useRef<HTMLIonCardElement>(null)
  const [fit, setFit] = useState({ count: 0, compact: true, hidden: true })

  useEffect(() => {
    const card = ref.current
    const content = card?.closest('ion-content')
    if (!card || !content) return
    let disposed = false
    let cleanup = () => {}
    void content.getScrollElement().then((scroll) => {
      if (disposed) return
      const header = card.querySelector<HTMLElement>('.recent-transactions__header')!
      const footer = card.querySelector<HTMLElement>('.recent-transactions__footer')!
      const message = card.querySelector<HTMLElement>('.recent-transactions__message')
      const rows = Array.from(card.querySelectorAll<HTMLElement>('.recent-transactions__row'))
      const fab = content.querySelector<HTMLElement>('ion-fab[vertical="bottom"]')
      let frame: number | undefined
      const measure = () => {
        frame = undefined
        const viewport = window.visualViewport
        const viewportBottom = Math.min(scroll.getBoundingClientRect().bottom,
          viewport ? viewport.offsetTop + viewport.height : window.innerHeight)
        // Work from the unscrolled position; scrolling must not reveal extra rows.
        const top = card.parentElement!.getBoundingClientRect().top + scroll.scrollTop
        const padding = parseFloat(getComputedStyle(scroll).paddingBottom) || 0
        const fabRect = fab?.getBoundingClientRect()
        // The FAB padding is a scrolling reserve, not the space occupied by the button.
        // Fit up to the actual button with a gap instead of subtracting that reserve twice.
        const bottom = fabRect && fabRect.height > 0
          ? Math.min(viewportBottom, fabRect.top - 16)
          : viewportBottom - padding
        const margin = parseFloat(getComputedStyle(card).marginBottom) || 0
        const available = Math.max(0, bottom - top - margin - 2)
        const footerHeight = footer.getBoundingClientRect().height
        const headerHeight = header.getBoundingClientRect().height
        const count = fitRecentTransactions(available, headerHeight, footerHeight,
          rows.map((row) => row.getBoundingClientRect().height))
        const compact = rows.length > 0 ? count === 0
          : headerHeight + footerHeight + (message?.getBoundingClientRect().height ?? 0) > available
        const hidden = footerHeight > available
        setFit((previous) => previous.count === count && previous.compact === compact && previous.hidden === hidden
          ? previous : { count, compact, hidden })
      }
      // Batch layout reads after React/Ionic updates; never recurse through promise microtasks.
      const scheduleMeasure = () => {
        if (frame === undefined) frame = requestAnimationFrame(measure)
      }
      const observer = new ResizeObserver(scheduleMeasure)
      for (const element of [scroll, content, card.closest('.app-content-body'), header, footer, message, fab, ...rows]) {
        if (element) observer.observe(element)
      }
      window.addEventListener('resize', scheduleMeasure)
      window.visualViewport?.addEventListener('resize', scheduleMeasure)
      window.visualViewport?.addEventListener('scroll', scheduleMeasure)
      scheduleMeasure()
      cleanup = () => {
        observer.disconnect()
        if (frame !== undefined) cancelAnimationFrame(frame)
        window.removeEventListener('resize', scheduleMeasure)
        window.visualViewport?.removeEventListener('resize', scheduleMeasure)
        window.visualViewport?.removeEventListener('scroll', scheduleMeasure)
      }
    })
    return () => { disposed = true; cleanup() }
  }, [contentKey, status])

  return { ref, ...fit }
}
