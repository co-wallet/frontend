import { useState, type ReactNode } from 'react'
import {
  IonButton, IonIcon, IonItem, IonLabel, IonList, IonSearchbar,
} from '@ionic/react'
import { checkmarkCircle, chevronDownOutline } from 'ionicons/icons'
import { EntitySelectModal } from './EntitySelectModal'
import './CategorySelect.css'
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
  emptyLabel?: string
  renderIcon?: (option: T) => ReactNode
}

export function FilterMultiSelect<T extends FilterMultiSelectOption>({
  label, options, selectedIds, onChange, searchLabel, hiddenLabel, emptyLabel = 'Не выбрано', renderIcon,
}: FilterMultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draftIds, setDraftIds] = useState<string[]>([])
  const selected = selectedIds.flatMap((id) => {
    const option = options.find((item) => item.id === id)
    return option ? [option] : []
  })
  const firstName = selected[0]?.name ?? emptyLabel
  const summary = selected.length > 1 ? `${firstName} +${selected.length - 1}` : firstName
  const query = search.trim().toLocaleLowerCase('ru')
  const matching = options.filter((option) => option.name.toLocaleLowerCase('ru').includes(query))
  const visible = matching.filter((option) => !option.hidden || draftIds.includes(option.id))
  const hidden = matching.filter((option) => option.hidden && !draftIds.includes(option.id))

  function optionItem(option: T) {
    return (
      <IonItem key={option.id} button detail={false}
        className="category-select-option filter-multiselect-option"
        role="checkbox" aria-label={option.name} aria-checked={draftIds.includes(option.id)}
        onClick={() => setDraftIds((previous) => previous.includes(option.id)
          ? previous.filter((id) => id !== option.id) : [...previous, option.id])}>
        {renderIcon && <span slot="start" className="category-select-icon">{renderIcon(option)}</span>}
        <IonLabel><h2>{option.name}</h2></IonLabel>
        {draftIds.includes(option.id) && <IonIcon slot="end" icon={checkmarkCircle}
          color="primary" aria-hidden="true" />}
      </IonItem>
    )
  }

  return (
    <div className="filter-multiselect-row">
      <span className="filter-multiselect-label">{label}</span>
      <IonButton fill="outline" className="filter-multiselect-trigger"
        aria-label={`${label}: ${summary}`} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { setSearch(''); setDraftIds([...selectedIds]); setOpen(true) }}>
        <span className="filter-multiselect-value">
          <span className="filter-multiselect-first">{firstName}</span>
          {selected.length > 1 && <span className="filter-multiselect-count">+{selected.length - 1}</span>}
          <IonIcon icon={chevronDownOutline} aria-hidden="true" />
        </span>
      </IonButton>
      {open && (
        <EntitySelectModal title={label} isOpen onDismiss={() => setOpen(false)} footer={
          <div className="filter-multiselect-footer">
            <IonButton expand="block" fill="outline" onClick={() => setDraftIds([])}>Сбросить</IonButton>
            <IonButton expand="block" onClick={() => { onChange(draftIds); setOpen(false) }}>Применить</IonButton>
            </div>
        }>
            {searchLabel && <IonSearchbar value={search} placeholder={searchLabel} aria-label={searchLabel}
              debounce={0} onIonInput={(event) => setSearch(event.detail.value ?? '')} />}
            <IonList inset className="category-select-modal__list filter-multiselect-options" aria-label={label}>
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
        </EntitySelectModal>
      )}
    </div>
  )
}
