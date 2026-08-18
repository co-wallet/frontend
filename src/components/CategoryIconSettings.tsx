import { IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/react'

import type { CategoryType } from '@/api/categories'
import { CategoryIcon, CategoryIconPicker } from './CategoryIcon'

export function CategoryIconSettings({
  value,
  type,
  onChange,
  sessionKey,
}: {
  value: string
  type: CategoryType
  onChange: (value: string) => void
  sessionKey: string
}) {
  return (
    <div className="account-icon-settings">
      <IonAccordionGroup key={sessionKey}>
        <IonAccordion value="category-icon-settings">
          <IonItem slot="header" className="account-icon-settings__header">
            <span slot="start">
              <CategoryIcon value={value} type={type} size={32} />
            </span>
            <IonLabel>
              <h2>Иконка и оформление</h2>
            </IonLabel>
          </IonItem>
          <div slot="content">
            <CategoryIconPicker value={value} type={type} onChange={onChange} />
          </div>
        </IonAccordion>
      </IonAccordionGroup>
    </div>
  )
}
