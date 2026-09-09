import type { ReactNode } from 'react'
import { IonBackButton, IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/react'

interface PageHeaderProps {
  title: string
  backHref?: string | false
  actions?: ReactNode
  children?: ReactNode
}

/** Shared navigation for signed-in pages. Children can add secondary toolbars. */
export function PageHeader({ title, backHref = '/dashboard', actions, children }: PageHeaderProps) {
  return (
    <IonHeader>
      <IonToolbar>
        {backHref !== false && (
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} text="Назад" />
          </IonButtons>
        )}
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          {actions}
          <IonMenuButton aria-label="Главное меню" />
        </IonButtons>
      </IonToolbar>
      {children}
    </IonHeader>
  )
}
