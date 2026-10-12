import { useRef, type ReactNode, type TouchEvent } from 'react'
import { IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/react'
import { usePageBack } from './usePageBack'

interface PageHeaderProps {
  title: string
  backHref?: string | false
  actions?: ReactNode
  children?: ReactNode
}

/** Shared navigation for signed-in pages. Children can add secondary toolbars. */
export function PageHeader({ title, backHref = '/dashboard', actions, children }: PageHeaderProps) {
  const goBack = usePageBack(backHref || '/dashboard')
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  function handleTouchStart(event: TouchEvent<HTMLIonToolbarElement>) {
    swipeStart.current = null
    const target = event.target as HTMLElement
    if (backHref === false || event.touches.length !== 1 ||
      target.closest('.ion-page-hidden, ion-buttons, button, a, input, select, textarea, [role="button"]')) return
    const touch = event.touches[0]
    swipeStart.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(event: TouchEvent<HTMLIonToolbarElement>) {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || event.touches.length || event.changedTouches.length !== 1) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (dx <= -60 && Math.abs(dx) >= Math.abs(dy) * 2) goBack()
  }

  return (
    <IonHeader>
      <IonToolbar
        className="page-header-toolbar"
        onTouchStart={handleTouchStart}
        onTouchMove={(event) => { if (event.touches.length !== 1) swipeStart.current = null }}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { swipeStart.current = null }}
      >
        <IonButtons slot="start">
          <IonMenuButton aria-label="Главное меню" />
        </IonButtons>
        <IonTitle>{title}</IonTitle>
        {actions && <IonButtons slot="end">{actions}</IonButtons>}
      </IonToolbar>
      {children}
    </IonHeader>
  )
}
