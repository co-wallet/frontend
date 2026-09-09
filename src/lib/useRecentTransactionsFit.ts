import { useEffect, useRef, useState } from 'react'
import { fitRecentTransactions } from './fitRecentTransactions'

export function useRecentTransactionsFit() {
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
      const measure = () => {
        const viewport = window.visualViewport
        const bottom = Math.min(scroll.getBoundingClientRect().bottom,
          viewport ? viewport.offsetTop + viewport.height : window.innerHeight)
        // Work from the unscrolled position; scrolling must not reveal extra rows.
        const top = card.getBoundingClientRect().top + scroll.scrollTop
        const padding = parseFloat(getComputedStyle(scroll).paddingBottom) || 0
        const margin = parseFloat(getComputedStyle(card).marginBottom) || 0
        const available = Math.max(0, bottom - top - padding - margin - 2)
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
      const observer = new ResizeObserver(measure)
      for (const element of [scroll, content, card.closest('.app-content-body'), header, footer, message, ...rows]) {
        if (element) observer.observe(element)
      }
      window.addEventListener('resize', measure)
      window.visualViewport?.addEventListener('resize', measure)
      window.visualViewport?.addEventListener('scroll', measure)
      measure()
      cleanup = () => {
        observer.disconnect()
        window.removeEventListener('resize', measure)
        window.visualViewport?.removeEventListener('resize', measure)
        window.visualViewport?.removeEventListener('scroll', measure)
      }
    })
    return () => { disposed = true; cleanup() }
  })

  return { ref, ...fit }
}
