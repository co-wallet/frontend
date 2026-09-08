import { useState } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { checkmarkCircle, chevronExpandOutline } from 'ionicons/icons'

import type { CategoryNode, CategoryType } from '@/api/categories'
import {
  CategoryIcon,
  UNCATEGORIZED_CATEGORY_ICON,
} from '@/components/CategoryIcon'

import './CategorySelect.css'

interface CategorySelectProps {
  label?: string
  categories: CategoryNode[]
  type: CategoryType
  value: string
  onChange: (categoryId: string) => void
}

export function CategorySelect({
  label = 'Категория',
  categories,
  type,
  value,
  onChange,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedCategory = categories.find((category) => category.id === value)
  const selectedLabel = selectedCategory?.name ?? 'Без категории'

  const selectCategory = (categoryId: string) => {
    onChange(categoryId)
    setIsOpen(false)
  }

  return (
    <>
      <IonItem
        key={selectedCategory?.id ?? 'uncategorized'}
        className="category-select-trigger"
        button
        detail={false}
        aria-label={`${label}: ${selectedLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <span slot="start" className="category-select-icon">
          <CategoryIcon
            value={selectedCategory?.icon ?? UNCATEGORIZED_CATEGORY_ICON}
            type={type}
            size={38}
            ariaLabel={selectedCategory?.name ?? 'Без категории'}
          />
        </span>
        <IonLabel className="category-select-trigger__label">
          <p>{label}</p>
          <h2>{selectedLabel}</h2>
        </IonLabel>
        <IonIcon slot="end" icon={chevronExpandOutline} color="medium" aria-hidden="true" />
      </IonItem>

      <IonModal
        className="category-select-modal"
        isOpen={isOpen}
        initialBreakpoint={0.65}
        breakpoints={[0, 0.65, 0.9]}
        handleBehavior="cycle"
        onDidDismiss={() => setIsOpen(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{label}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)}>Закрыть</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList inset className="category-select-modal__list">
            <IonItem
              button
              detail={false}
              className="category-select-option"
              aria-label="Без категории"
              aria-current={!value ? 'true' : undefined}
              onClick={() => selectCategory('')}
            >
              <span slot="start" className="category-select-icon">
                <CategoryIcon
                  value={UNCATEGORIZED_CATEGORY_ICON}
                  type={type}
                  size={42}
                  ariaLabel="Без категории"
                />
              </span>
              <IonLabel><h2>Без категории</h2></IonLabel>
              {!value && (
                <IonIcon slot="end" icon={checkmarkCircle} color="primary" aria-label="Выбрано" />
              )}
            </IonItem>

            {categories.map((category) => {
              const selected = category.id === value
              return (
                <IonItem
                  button
                  detail={false}
                  key={category.id}
                  className="category-select-option"
                  aria-label={category.name}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => selectCategory(category.id)}
                >
                  <span slot="start" className="category-select-icon">
                    <CategoryIcon
                      value={category.icon}
                      type={category.type}
                      size={42}
                      ariaLabel={category.name}
                    />
                  </span>
                  <IonLabel><h2>{category.name}</h2></IonLabel>
                  {selected && (
                    <IonIcon slot="end" icon={checkmarkCircle} color="primary" aria-label="Выбрано" />
                  )}
                </IonItem>
              )
            })}
          </IonList>
        </IonContent>
      </IonModal>
    </>
  )
}
