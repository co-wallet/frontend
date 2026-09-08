import { IonButton, IonButtons, IonIcon, IonItem, IonLabel } from '@ionic/react'
import { createOutline, trashOutline } from 'ionicons/icons'

import type { Category } from '@/api/categories'
import { CategoryIcon } from './CategoryIcon'

import './CategoryList.css'

export function CategoryList({ categories, onEdit, onDelete }: {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  return <>{categories.map((category) => (
    <IonItem key={category.id} className="category-list-row">
      <span slot="start" className="category-list-row__icon">
        <CategoryIcon value={category.icon} type={category.type} size={32} />
      </span>
      <IonLabel className="category-list-row__label">{category.name}</IonLabel>
      <IonButtons slot="end" className="category-list-row__actions">
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
