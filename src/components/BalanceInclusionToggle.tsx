import { useId } from 'react'
import { IonIcon, IonItem, IonPopover, IonToggle } from '@ionic/react'
import { helpCircleOutline } from 'ionicons/icons'

import './BalanceInclusionToggle.css'

export const GENERAL_BALANCE_HELP =
  'Общий баланс — сумма ваших долей на всех счетах с включённой настройкой. Суммы пересчитываются в основную валюту профиля.'

export function GeneralBalanceHelp() {
  return (
    <div className="balance-inclusion-popover__content">
      <h2>Общий баланс</h2>
      <p>{GENERAL_BALANCE_HELP}</p>
    </div>
  )
}

export function BalanceInclusionToggle({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  const helpTriggerId = `general-balance-help-${useId().replace(/:/g, '')}`

  return (
    <>
      <IonItem className={className}>
        <button
          id={helpTriggerId}
          type="button"
          className="balance-inclusion-help-trigger"
          aria-label="Что такое общий баланс?"
        >
          <span>Учитывать в общем балансе</span>
          <IonIcon icon={helpCircleOutline} aria-hidden="true" />
        </button>
        <IonToggle
          slot="end"
          checked={checked}
          aria-label="Учитывать в общем балансе"
          onIonChange={(event) => onChange(event.detail.checked)}
        />
      </IonItem>

      <IonPopover
        trigger={helpTriggerId}
        triggerAction="click"
        side="top"
        alignment="center"
        size="auto"
        className="balance-inclusion-popover"
      >
        <GeneralBalanceHelp />
      </IonPopover>
    </>
  )
}
