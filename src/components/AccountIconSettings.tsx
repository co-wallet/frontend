import { IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/react'

import { AccountIcon, AccountIconPicker } from './AccountIcon'

export function AccountIconSettings({
  value,
  onChange,
  sessionKey,
}: {
  value: string
  onChange: (value: string) => void
  sessionKey: string
}) {
  return (
    <IonAccordionGroup key={sessionKey} className="account-icon-settings">
      <IonAccordion value="account-icon-settings">
        <IonItem slot="header" lines="full" className="account-icon-settings__header">
          <span slot="start">
            <AccountIcon value={value} size={32} />
          </span>
          <IonLabel>
            <h2>Иконка и оформление</h2>
          </IonLabel>
        </IonItem>
        <div slot="content">
          <AccountIconPicker value={value} onChange={onChange} />
        </div>
      </IonAccordion>
    </IonAccordionGroup>
  )
}
