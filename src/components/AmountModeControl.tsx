import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/react'
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
    <div className="amount-mode-control">
      <IonLabel>Расчёт сумм</IonLabel>
      <IonSegment value={value} aria-label="Расчёт сумм" onIonChange={(event) => {
        if (event.detail.value === 'share' || event.detail.value === 'total') onChange(event.detail.value)
      }}>
        <IonSegmentButton value="share"><IonLabel>Моя доля</IonLabel></IonSegmentButton>
        <IonSegmentButton value="total"><IonLabel>Полные суммы</IonLabel></IonSegmentButton>
      </IonSegment>
    </div>
  )
}
