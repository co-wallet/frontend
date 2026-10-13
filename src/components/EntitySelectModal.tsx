import type { ReactNode } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react'

import './EntitySelectModal.css'

export function EntitySelectModal({
  title,
  isOpen,
  onDismiss,
  children,
  footer,
}: {
  title: string
  isOpen: boolean
  onDismiss: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <IonModal
      className="entity-select-modal"
      isOpen={isOpen}
      onDidDismiss={onDismiss}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>Закрыть</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="entity-select-modal__content">
        {children}
      </IonContent>
      {footer && <IonFooter>{footer}</IonFooter>}
    </IonModal>
  )
}
