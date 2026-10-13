import { useState, type ReactNode } from 'react'
import {
  IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon,
  IonItem, IonList, IonModal, IonNote, IonSearchbar, IonTitle, IonToolbar,
} from '@ionic/react'
import { chevronDownOutline } from 'ionicons/icons'
import './FilterMultiSelect.css'

export interface FilterMultiSelectOption {
  id: string
  name: string
  hidden?: boolean
}

interface FilterMultiSelectProps<T extends FilterMultiSelectOption> {
  label: string
  options: T[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  searchLabel?: string
  hiddenLabel?: string
  renderIcon?: (option: T) => ReactNode
}

export function FilterMultiSelect<T extends FilterMultiSelectOption>({
  label, options, selectedIds, onChange, searchLabel, hiddenLabel, renderIcon,
}: FilterMultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = selectedIds.flatMap((id) => {
    const option = options.find((item) => item.id === id)
    return option ? [option] : []
  })
  const firstName = selected[0]?.name ?? 'Не выбрано'
  const summary = selected.length > 1 ? `${firstName} +${selected.length - 1}` : firstName
  const query = search.trim().toLocaleLowerCase('ru')
  const matching = options.filter((option) => option.name.toLocaleLowerCase('ru').includes(query))
  const visible = matching.filter((option) => !option.hidden || selectedIds.includes(option.id))
  const hidden = matching.filter((option) => option.hidden && !selectedIds.includes(option.id))

  function optionItem(option: T) {
    return (
      <IonItem key={option.id} className="filter-multiselect-option">
        {renderIcon && <span slot="start" className="filter-multiselect-icon">{renderIcon(option)}</span>}
        <IonCheckbox checked={selectedIds.includes(option.id)} justify="space-between"
          onIonChange={(event) => onChange(event.detail.checked
            ? [...selectedIds.filter((id) => id !== option.id), option.id]
            : selectedIds.filter((id) => id !== option.id))}>
          {option.name}
        </IonCheckbox>
      </IonItem>
    )
  }

  return (
    <div className="filter-multiselect-row">
      <span className="filter-multiselect-label">{label}</span>
      <IonButton fill="outline" className="filter-multiselect-trigger"
        aria-label={`${label}: ${summary}`} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { setSearch(''); setOpen(true) }}>
        <span className="filter-multiselect-value">
          <span className="filter-multiselect-first">{firstName}</span>
          {selected.length > 1 && <span className="filter-multiselect-count">+{selected.length - 1}</span>}
          <IonIcon icon={chevronDownOutline} aria-hidden="true" />
        </span>
      </IonButton>
      {open && (
        <IonModal isOpen className="filter-multiselect-modal" onDidDismiss={() => setOpen(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{label}</IonTitle>
              <IonButtons slot="end"><IonButton onClick={() => setOpen(false)}>Готово</IonButton></IonButtons>
            </IonToolbar>
            {searchLabel && <IonSearchbar value={search} placeholder={searchLabel} aria-label={searchLabel}
              debounce={0} onIonInput={(event) => setSearch(event.detail.value ?? '')} />}
            <div className="filter-multiselect-actions">
              <IonButton fill="clear" disabled={options.length === 0}
                onClick={() => onChange(options.map((option) => option.id))}>Выбрать все</IonButton>
              <IonButton fill="clear" disabled={selectedIds.length === 0}
                onClick={() => onChange([])}>Снять все</IonButton>
              <IonNote aria-live="polite">Выбрано: {selected.length}</IonNote>
            </div>
          </IonHeader>
          <IonContent>
            <IonList className="filter-multiselect-options" aria-label={label}>
              {visible.map(optionItem)}
              {hidden.length > 0 && (query
                ? hidden.map(optionItem)
                : <details className="filter-multiselect-hidden">
                  <summary>{hiddenLabel ?? 'Скрытые варианты'} ({hidden.length})</summary>
                  {hidden.map(optionItem)}
                </details>)}
            </IonList>
            {matching.length === 0 && <p className="filter-multiselect-empty" role="status">
              {query ? 'Ничего не найдено' : 'Нет доступных вариантов'}
            </p>}
          </IonContent>
        </IonModal>
      )}
    </div>
  )
}
