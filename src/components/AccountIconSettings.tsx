import { IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/react'

import { AccountIcon, AccountIconPicker } from './AccountIcon'

export function AccountIconSettings({
  value,
  onChange,
  sessionKey,
  allowCustom = true,
}: {
  value: string
  onChange: (value: string) => void
  allowCustom?: boolean
  sessionKey: string
}) {
  return (
    <div className="account-icon-settings">
      <IonAccordionGroup key={sessionKey}>
        <IonAccordion value="account-icon-settings">
          <IonItem slot="header" className="account-icon-settings__header">
            <span slot="start">
              <AccountIcon value={value} size={32} />
            </span>
            <IonLabel>
              <h2>Иконка и оформление</h2>
            </IonLabel>
          </IonItem>
          <div slot="content">
            <AccountIconPicker allowCustom={allowCustom} value={value} onChange={onChange} />
          </div>
        </IonAccordion>
      </IonAccordionGroup>
    </div>
  )
}
