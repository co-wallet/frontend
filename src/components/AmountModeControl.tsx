import { IonCheckbox } from '@ionic/react'
import type { AmountMode } from '@/api/analytics'
import './AmountModeControl.css'

export const AMOUNT_MODE_LABELS: Record<AmountMode, string> = {
  share: 'Моя доля',
  total: 'Полные суммы',
}

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
