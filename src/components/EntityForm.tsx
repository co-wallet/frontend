import type { ComponentProps, ReactNode } from 'react'
import {
  IonButton, IonButtons, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader,
  IonSelect, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/react'
import { chevronExpandOutline } from 'ionicons/icons'
import './EntityForm.css'

export function EntityFormHeader({ title, onCancel, onSubmit, pending = false, disabled = false }: {
  title: string
  onCancel: () => void
  onSubmit: () => void
  pending?: boolean
  disabled?: boolean
}) {
  return (
    <IonHeader className="entity-form-header">
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton onClick={onCancel}>Отмена</IonButton>
        </IonButtons>
        <IonTitle size="small">{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton strong onClick={onSubmit} disabled={pending || disabled} aria-label="Сохранить">
            {pending ? <IonSpinner name="dots" /> : 'Сохранить'}
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  )
}

export function EntityFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <IonList className="entity-form-section">
      <IonListHeader className="entity-form-section__header"><IonLabel>{title}</IonLabel></IonListHeader>
      {children}
    </IonList>
  )
}

export function EntityFormSelect(props: ComponentProps<typeof IonSelect>) {
  return <IonSelect labelPlacement="fixed" interface="action-sheet" cancelText="Отмена" {...props} />
}

export function EntityFormError({ children }: { children?: ReactNode }) {
  return children ? <IonText color="danger"><p className="entity-form-error" role="alert">{children}</p></IonText> : null
}

export function EntityFormPicker({ label, value, icon, accessibleValue = value, isOpen, onOpen }: {
  label: string
  value: string
  icon?: ReactNode
  accessibleValue?: string
  isOpen: boolean
  onOpen: () => void
}) {
  return (
    <IonItem key={accessibleValue} button detail={false} className="entity-form-picker"
      aria-label={`${label}: ${accessibleValue}`} aria-haspopup="dialog" aria-expanded={isOpen} onClick={onOpen}>
      <IonLabel>{label}</IonLabel>
      <div slot="end" className="entity-form-picker__value">
        {icon}
        <span>{value}</span>
        <IonIcon icon={chevronExpandOutline} color="medium" aria-hidden="true" />
      </div>
    </IonItem>
  )
}
