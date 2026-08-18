import { useId } from 'react'
import {
  IonIcon,
  IonItem,
  IonNote,
  IonPopover,
  IonSelect,
  IonSelectOption,
} from '@ionic/react'
import { helpCircleOutline } from 'ionicons/icons'

import type { AccountKind } from '@/api/accounts'
import { ACCOUNT_KIND_OPTIONS, accountKindLabel } from '@/lib/accountKind'

import './AccountKindField.css'

export function AccountKindHelp() {
  return (
    <div className="account-kind-help__content">
      <h2>Типы средств</h2>
      <dl>
        {ACCOUNT_KIND_OPTIONS.map((option) => (
          <div key={option.value}>
            <dt>{option.label}</dt>
            <dd>{option.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function AccountKindField({
  value,
  onChange,
  className,
}: {
  value: AccountKind
  onChange?: (kind: AccountKind) => void
  className?: string
}) {
  const helpTriggerId = `account-kind-help-${useId().replace(/:/g, '')}`

  return (
    <>
      <IonItem className={className}>
        <button
          id={helpTriggerId}
          type="button"
          className="account-kind-help__trigger"
          aria-label="Что означают типы средств?"
        >
          <span>Тип средств</span>
          <IonIcon icon={helpCircleOutline} aria-hidden="true" />
        </button>

        {onChange ? (
          <IonSelect
            slot="end"
            className="account-kind-field__select"
            aria-label="Тип средств"
            interface="action-sheet"
            cancelText="Отмена"
            value={value}
            selectedText={accountKindLabel(value)}
            onIonChange={(event) => onChange(event.detail.value as AccountKind)}
          >
            {ACCOUNT_KIND_OPTIONS.map((option) => (
              <IonSelectOption key={option.value} value={option.value}>
                {option.label}
              </IonSelectOption>
            ))}
          </IonSelect>
        ) : (
          <IonNote slot="end" className="account-form-readonly-value">
            {accountKindLabel(value)}
          </IonNote>
        )}
      </IonItem>

      <IonPopover
        trigger={helpTriggerId}
        triggerAction="click"
        side="top"
        alignment="center"
        size="auto"
        className="account-kind-help"
      >
        <AccountKindHelp />
      </IonPopover>
    </>
  )
}
