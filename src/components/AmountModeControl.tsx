import { IonCheckbox } from '@ionic/react'
import type { AmountMode } from '@/api/analytics'
import './AmountModeControl.css'

export function AmountModeControl({ value, onChange }: {
  value: AmountMode
  onChange: (mode: AmountMode) => void
}) {
  return (
    <IonCheckbox
      className="amount-mode-control"
      labelPlacement="end"
      justify="start"
      checked={value === 'total'}
      onIonChange={(event) => onChange(event.detail.checked ? 'total' : 'share')}
    >
      Показывать полные суммы
    </IonCheckbox>
  )
}
