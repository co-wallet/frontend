import type { ReactNode } from 'react'
import { IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/react'

interface PageHeaderProps {
  title: string
  actions?: ReactNode
  children?: ReactNode
}

/** Shared navigation for signed-in pages. Children can add secondary toolbars. */
export function PageHeader({ title, actions, children }: PageHeaderProps) {
  return (
    <IonHeader>
      <IonToolbar>
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
