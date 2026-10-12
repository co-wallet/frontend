import { useState, type ReactNode } from 'react'
import { IonButton, IonNote, IonSearchbar } from '@ionic/react'

interface FilterOption {
  id: string
  name: string
  hidden?: boolean
}

interface FilterOptionListProps<T extends FilterOption> {
  id: string
  options: T[]
  selectedIds: string[]
  searchLabel: string
  hiddenLabel?: string
  renderOption: (option: T) => ReactNode
}

const COLLAPSED_LIMIT = 5

export function FilterOptionList<T extends FilterOption>({
  id, options, selectedIds, searchLabel, hiddenLabel, renderOption,
}: FilterOptionListProps<T>) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [hiddenExpanded, setHiddenExpanded] = useState(false)
  const query = search.trim().toLocaleLowerCase('ru')
  const selected = options.filter((option) => selectedIds.includes(option.id))
  const available = options.filter((option) =>
    !selectedIds.includes(option.id) && option.name.toLocaleLowerCase('ru').includes(query),
  )
  const visible = available.filter((option) => !option.hidden)
  const hidden = available.filter((option) => option.hidden)

  function optionGroup(items: T[], groupId: string, isExpanded: boolean, onExpand: () => void) {
    return (
      <>
        <div id={groupId} className="filter-sheet-options">
          {(isExpanded ? items : items.slice(0, COLLAPSED_LIMIT)).map(renderOption)}
        </div>
        {items.length > COLLAPSED_LIMIT && (
          <IonButton fill="clear" className="filter-sheet-expand"
            aria-expanded={isExpanded} aria-controls={groupId} onClick={onExpand}>
            {isExpanded ? 'Свернуть' : `Показать все (${items.length})`}
          </IonButton>
        )}
      </>
    )
  }

  return (
    <div className="filter-sheet-list">
      <IonSearchbar value={search} placeholder={searchLabel} aria-label={searchLabel}
        className="filter-sheet-search" debounce={0}
        onIonInput={(event) => {
          setSearch(event.detail.value ?? '')
          setExpanded(false)
          setHiddenExpanded(false)
        }} />
      {selected.length > 0 && (
        <div className="filter-sheet-options" role="group" aria-label="Выбранные варианты">
          {selected.map(renderOption)}
        </div>
      )}
      {visible.length > 0 && optionGroup(visible, `${id}-options`, expanded, () => setExpanded(!expanded))}
      {hiddenLabel && hidden.length > 0 && (
        <details className="filter-sheet-hidden">
          <summary>{hiddenLabel} ({hidden.length})</summary>
          {optionGroup(hidden, `${id}-hidden-options`, hiddenExpanded, () => setHiddenExpanded(!hiddenExpanded))}
        </details>
      )}
      {query && !options.some((option) => option.name.toLocaleLowerCase('ru').includes(query)) && (
        <IonNote className="filter-sheet-empty" role="status">Ничего не найдено</IonNote>
      )}
    </div>
  )
}
