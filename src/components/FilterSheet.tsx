import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonBadge,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonNote,
} from '@ionic/react'
import { checkmarkCircleOutline, closeOutline, funnelOutline } from 'ionicons/icons'
import { accountsApi } from '@/api/accounts'
import { AccountIcon } from '@/components/AccountIcon'
import { CategoryIcon } from '@/components/CategoryIcon'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { type TransactionFilter } from '@/api/transactions'
import { flattenCategories } from '@/lib/categories'

import './FilterSheet.css'

interface FilterSheetProps {
  value: TransactionFilter
  onChange: (f: TransactionFilter) => void
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

export function FilterSheet({ value, onChange }: FilterSheetProps) {
  const [open, setOpen] = useState(false)

  const [accountIds, setAccountIds] = useState<string[]>(value.accountIds ?? [])
  const [categoryIds, setCategoryIds] = useState<string[]>(value.categoryIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(value.tagIds ?? [])
  const [tagMode, setTagMode] = useState<'or' | 'and'>(value.tagMode ?? 'or')

  useEffect(() => {
    if (open) {
      setAccountIds(value.accountIds ?? [])
      setCategoryIds(value.categoryIds ?? [])
      setTagIds(value.tagIds ?? [])
      setTagMode(value.tagMode ?? 'or')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list() })
  const { data: expenseTree = [] } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesApi.list('expense'),
  })
  const { data: incomeTree = [] } = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: () => categoriesApi.list('income'),
  })
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })

  const allCategories: CategoryNode[] = [
    ...flattenCategories(expenseTree),
    ...flattenCategories(incomeTree),
  ]

  function apply() {
    const f: TransactionFilter = {}
    if (accountIds.length) f.accountIds = accountIds
    if (categoryIds.length) f.categoryIds = categoryIds
    if (tagIds.length) { f.tagIds = tagIds; f.tagMode = tagMode }
    onChange(f)
    setOpen(false)
  }

  function reset() {
    setAccountIds([])
    setCategoryIds([])
    setTagIds([])
    setTagMode('or')
    onChange({})
    setOpen(false)
  }

  const activeCount = [
    (value.accountIds?.length ?? 0) > 0,
    (value.categoryIds?.length ?? 0) > 0,
    (value.tagIds?.length ?? 0) > 0,
  ].filter(Boolean).length

  return (
    <>
      <div className="filter-sheet-trigger-wrapper">
        <IonButton
          fill={activeCount > 0 ? 'solid' : 'outline'}
          className="filter-sheet-trigger"
          onClick={() => setOpen(true)}
          aria-label={activeCount > 0 ? `Фильтры, активно: ${activeCount}` : 'Фильтры'}
        >
          <IonIcon icon={funnelOutline} slot="icon-only" />
        </IonButton>
        {activeCount > 0 && (
          <IonBadge className="filter-sheet-trigger__badge" aria-hidden="true">
            {activeCount}
          </IonBadge>
        )}
      </div>

      <IonModal
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        breakpoints={[0, 0.75, 1]}
        initialBreakpoint={0.75}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Фильтры</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setOpen(false)} aria-label="Закрыть фильтры">
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding filter-sheet-content">
          {/* Accounts */}
          {accounts.length > 0 && (
            <section className="filter-sheet-section" aria-labelledby="filter-accounts-title">
              <IonNote id="filter-accounts-title" className="filter-sheet-section__title">Счета</IonNote>
              <div className="filter-sheet-options">
                {accounts.map((a) => {
                  const selected = accountIds.includes(a.id)
                  return (
                    <IonButton
                      key={a.id}
                      fill={selected ? 'solid' : 'outline'}
                      className="filter-sheet-option"
                      onClick={() => setAccountIds((prev) => toggle(prev, a.id))}
                      aria-pressed={selected}
                    >
                      <span className="filter-sheet-option__content">
                        <AccountIcon value={a.icon} size={22} />
                        <span>{a.name}</span>
                        {selected && <IonIcon className="filter-sheet-option__check" icon={checkmarkCircleOutline} />}
                      </span>
                    </IonButton>
                  )
                })}
              </div>
            </section>
          )}

          {/* Categories */}
          {allCategories.length > 0 && (
            <section className="filter-sheet-section" aria-labelledby="filter-categories-title">
              <IonNote id="filter-categories-title" className="filter-sheet-section__title">Категории</IonNote>
              <div className="filter-sheet-options">
                {allCategories.map((c) => {
                  const selected = categoryIds.includes(c.id)
                  return (
                    <IonButton
                      key={c.id}
                      fill={selected ? 'solid' : 'outline'}
                      className="filter-sheet-option"
                      onClick={() => setCategoryIds((prev) => toggle(prev, c.id))}
                      aria-pressed={selected}
                    >
                      <span className="filter-sheet-option__content">
                        <CategoryIcon value={c.icon} type={c.type} size={22} />
                        <span>{c.name}</span>
                        {selected && <IonIcon className="filter-sheet-option__check" icon={checkmarkCircleOutline} />}
                      </span>
                    </IonButton>
                  )
                })}
              </div>
            </section>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <section className="filter-sheet-section" aria-labelledby="filter-tags-title">
              <div className="filter-sheet-section__heading">
                <IonNote id="filter-tags-title" className="filter-sheet-section__title">Теги</IonNote>
                <div className="filter-sheet-tag-mode-control">
                  <span className="filter-sheet-tag-mode__label">Совпадение</span>
                  <IonSegment
                    value={tagMode}
                    onIonChange={(e) => setTagMode(e.detail.value as 'or' | 'and')}
                    className="filter-sheet-tag-mode"
                    aria-label="Совпадение выбранных тегов"
                  >
                    <IonSegmentButton value="or" aria-label="Любой выбранный тег">
                      <IonLabel>Любой</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="and" aria-label="Все выбранные теги">
                      <IonLabel>Все</IonLabel>
                    </IonSegmentButton>
                  </IonSegment>
                </div>
              </div>
              <div className="filter-sheet-options">
                {tags.map((t) => {
                  const selected = tagIds.includes(t.id)
                  return (
                    <IonButton
                      key={t.id}
                      fill={selected ? 'solid' : 'outline'}
                      className="filter-sheet-option"
                      onClick={() => setTagIds((prev) => toggle(prev, t.id))}
                      aria-pressed={selected}
                    >
                      <span className="filter-sheet-option__content">
                        <span>#{t.name}</span>
                        {selected && <IonIcon className="filter-sheet-option__check" icon={checkmarkCircleOutline} />}
                      </span>
                    </IonButton>
                  )
                })}
              </div>
            </section>
          )}

          <div slot="fixed" className="filter-sheet-actions">
            <IonButton expand="block" fill="outline" onClick={reset}>
              Сбросить
            </IonButton>
            <IonButton expand="block" onClick={apply}>
              Применить
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  )
}
