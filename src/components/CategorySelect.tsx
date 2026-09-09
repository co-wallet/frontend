import { EntityFormPicker } from './EntityForm'
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
import { checkmarkCircle } from 'ionicons/icons'

import type { Category, CategoryType } from '@/api/categories'
import {
  CategoryIcon,
  UNCATEGORIZED_CATEGORY_ICON,
} from '@/components/CategoryIcon'

import './CategorySelect.css'

interface CategorySelectProps {
  label?: string
  categories: Category[]
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
      <EntityFormPicker label={label} value={selectedLabel}
        icon={<CategoryIcon value={selectedCategory?.icon ?? UNCATEGORIZED_CATEGORY_ICON}
          type={type} size={24} ariaLabel={selectedLabel} />}
        isOpen={isOpen} onOpen={() => setIsOpen(true)} />

      <IonModal
        className="category-select-modal"
        isOpen={isOpen}
        initialBreakpoint={0.5}
        breakpoints={[0, 0.5, 0.85]}
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

            {categories.filter((category) => !category.hidden || category.id === value).map((category) => {
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
