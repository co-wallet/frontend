import { IonButton, IonButtons, IonIcon, IonItem, IonLabel } from '@ionic/react'
import { createOutline, trashOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons'

import type { Category } from '@/api/categories'
import { CategoryIcon } from './CategoryIcon'

import './CategoryList.css'

export function CategoryList({ categories, onEdit, onDelete, onToggleHidden, visibilityPending }: {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onToggleHidden?: (category: Category) => void
  visibilityPending?: boolean
}) {
  return <>{categories.map((category) => (
    <IonItem key={category.id} className="category-list-row">
      <span slot="start" className="category-list-row__icon">
        <CategoryIcon value={category.icon} type={category.type} size={32} />
      </span>
      <IonLabel className="category-list-row__label">{category.name}{category.hidden && <p>Скрыта для меня</p>}</IonLabel>
      <IonButtons slot="end" className="category-list-row__actions">
        {onToggleHidden && <IonButton
          fill="clear" color="medium" disabled={visibilityPending}
          aria-label={`${category.hidden ? 'Показать' : 'Скрыть'} «${category.name}»`}
          onClick={() => onToggleHidden(category)}
        ><IonIcon slot="icon-only" icon={category.hidden ? eyeOutline : eyeOffOutline} /></IonButton>}
        <IonButton
          fill="clear"
          color="primary"
          aria-label={`Редактировать «${category.name}»`}
          title="Редактировать категорию"
          onClick={() => onEdit(category)}
        >
          <IonIcon slot="icon-only" icon={createOutline} />
        </IonButton>
        <IonButton
          fill="clear"
          color="danger"
          aria-label={`Удалить «${category.name}»`}
          title="Удалить категорию"
          onClick={() => onDelete(category)}
        >
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonButton>
      </IonButtons>
    </IonItem>
  ))}</>
}
