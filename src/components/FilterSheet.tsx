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
  IonCheckbox,
  IonFooter,
  IonPage,
} from '@ionic/react'
import { checkmarkCircleOutline, closeOutline, funnelOutline } from 'ionicons/icons'
import { accountsApi, type AccountKind } from '@/api/accounts'
import { AccountIcon } from '@/components/AccountIcon'
import { CategoryIcon } from '@/components/CategoryIcon'
import { categoriesApi, type Category } from '@/api/categories'
import { tagsApi, type Tag } from '@/api/tags'
import { type TransactionFilter } from '@/api/transactions'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'
import {
  DEFAULT_TRANSACTION_ACCOUNT_KINDS,
  transactionFilterAccounts,
} from '@/lib/accountFilters'

import './FilterSheet.css'

interface FilterSheetProps {
  value: TransactionFilter
  onChange: (f: TransactionFilter) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

export function FilterSheet({ value, onChange, isOpen, onOpenChange }: FilterSheetProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = isOpen ?? localOpen
  function setOpen(next: boolean) {
    setLocalOpen(next)
    onOpenChange?.(next)
  }

  const [accountIds, setAccountIds] = useState<string[]>(value.accountIds ?? [])
  const [accountKinds, setAccountKinds] = useState<AccountKind[]>(
    value.accountKinds ?? [...DEFAULT_TRANSACTION_ACCOUNT_KINDS],
  )
  const [includeShared, setIncludeShared] = useState(value.includeShared ?? false)
  const [includeTransferExpenses, setIncludeTransferExpenses] = useState(
    value.includeTransferExpenses ?? false,
  )
  const [includeTransferIncome, setIncludeTransferIncome] = useState(
    value.includeTransferIncome ?? true,
  )
  const [categoryIds, setCategoryIds] = useState<string[]>(value.categoryIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(value.tagIds ?? [])
  const [tagMode, setTagMode] = useState<'or' | 'and'>(value.tagMode ?? 'or')

  useEffect(() => {
    if (open) {
      setAccountIds(value.accountIds ?? [])
      setAccountKinds(value.accountKinds ?? [...DEFAULT_TRANSACTION_ACCOUNT_KINDS])
      setIncludeShared(value.includeShared ?? false)
      setIncludeTransferExpenses(value.includeTransferExpenses ?? false)
      setIncludeTransferIncome(value.includeTransferIncome ?? true)
      setCategoryIds(value.categoryIds ?? [])
      setTagIds(value.tagIds ?? [])
      setTagMode(value.tagMode ?? 'or')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list() })
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesApi.list('expense'),
  })
  const { data: incomeCategories = [] } = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: () => categoriesApi.list('income'),
  })
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })

  const allCategories: Category[] = [
    ...expenseCategories,
    ...incomeCategories,
  ]

  const hiddenCategories = allCategories.filter((category) => category.hidden)
  const hiddenTags = tags.filter((tag) => tag.hidden)
  const visibleAccounts = transactionFilterAccounts(accounts, { accountKinds, includeShared })

  function categoryOption(c: Category) {
    const selected = categoryIds.includes(c.id)
    return (
      <IonButton key={c.id} fill={selected ? 'solid' : 'outline'} className="filter-sheet-option"
        onClick={() => setCategoryIds((prev) => toggle(prev, c.id))} aria-pressed={selected}>
        <span className="filter-sheet-option__content">
          <CategoryIcon value={c.icon} type={c.type} size={22} />
          <span>{c.name}</span>
          {selected && <IonIcon className="filter-sheet-option__check" icon={checkmarkCircleOutline} />}
        </span>
      </IonButton>
    )
  }

  function tagOption(tag: Tag) {
    const selected = tagIds.includes(tag.id)
    return (
      <IonButton key={tag.id} fill={selected ? 'solid' : 'outline'} className="filter-sheet-option"
        onClick={() => setTagIds((prev) => toggle(prev, tag.id))} aria-pressed={selected}>
        <span className="filter-sheet-option__content">
          <span>#{tag.name}</span>
          {selected && <IonIcon className="filter-sheet-option__check" icon={checkmarkCircleOutline} />}
        </span>
      </IonButton>
    )
  }

  function apply() {
    const f: TransactionFilter = { accountKinds }
    if (includeShared) f.includeShared = true
    if (includeTransferExpenses) f.includeTransferExpenses = true
    if (!includeTransferIncome) f.includeTransferIncome = false
    if (accountIds.length) f.accountIds = accountIds
    if (categoryIds.length) f.categoryIds = categoryIds
    if (tagIds.length) { f.tagIds = tagIds; f.tagMode = tagMode }
    else if (value.withoutTags) f.withoutTags = true
    onChange(f)
    setOpen(false)
  }

  function reset() {
    setAccountIds([])
    setAccountKinds([...DEFAULT_TRANSACTION_ACCOUNT_KINDS])
    setIncludeShared(false)
    setIncludeTransferExpenses(false)
    setIncludeTransferIncome(true)
    setCategoryIds([])
    setTagIds([])
    setTagMode('or')
    onChange({})
    setOpen(false)
  }

  const activeCount = [
    (value.accountIds?.length ?? 0) > 0,
    value.accountKinds !== undefined,
    value.includeShared === true,
    value.includeTransferExpenses === true || value.includeTransferIncome === false,
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
        className="filter-sheet-modal"
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        breakpoints={[0, 1]}
        initialBreakpoint={1}
      >
        <IonPage>
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
          <section className="filter-sheet-section" aria-labelledby="filter-account-kinds-title">
            <IonNote id="filter-account-kinds-title" className="filter-sheet-section__title">
              Тип средств
            </IonNote>
            <div className="filter-sheet-options">
              {ACCOUNT_KIND_OPTIONS.map((option) => {
                const selected = accountKinds.includes(option.value)
                return (
                  <IonButton
                    key={option.value}
                    fill={selected ? 'solid' : 'outline'}
                    className="filter-sheet-option"
                    onClick={() => setAccountKinds((previous) => toggle(previous, option.value))}
                    aria-pressed={selected}
                  >
                    <span className="filter-sheet-option__content">
                      <span>{option.shortLabel}</span>
                      {selected && <IonIcon className="filter-sheet-option__check" icon={checkmarkCircleOutline} />}
                    </span>
                  </IonButton>
                )
              })}
            </div>
            <div className="filter-sheet-checkboxes">
              <IonCheckbox
                className="filter-sheet-checkbox"
                labelPlacement="end"
                justify="start"
                checked={includeShared}
                onIonChange={(event) => setIncludeShared(event.detail.checked)}
              >
                Учитывать общие счета
              </IonCheckbox>
            </div>
          </section>

          {/* Accounts */}
          {visibleAccounts.length > 0 && (
            <section className="filter-sheet-section" aria-labelledby="filter-accounts-title">
              <IonNote id="filter-accounts-title" className="filter-sheet-section__title">
                Конкретные счета
              </IonNote>
              <div className="filter-sheet-options">
                {visibleAccounts.map((a) => {
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

          <section className="filter-sheet-section" aria-labelledby="filter-transfers-title">
            <IonNote id="filter-transfers-title" className="filter-sheet-section__title">
              Переводы в суммах
            </IonNote>
            <div className="filter-sheet-checkboxes">
              <IonCheckbox
                className="filter-sheet-checkbox"
                labelPlacement="end"
                justify="start"
                checked={includeTransferExpenses}
                onIonChange={(event) => setIncludeTransferExpenses(event.detail.checked)}
              >
                Учитывать в расходах
              </IonCheckbox>
              <IonCheckbox
                className="filter-sheet-checkbox"
                labelPlacement="end"
                justify="start"
                checked={includeTransferIncome}
                onIonChange={(event) => setIncludeTransferIncome(event.detail.checked)}
              >
                Учитывать в доходах
              </IonCheckbox>
            </div>
          </section>

          {/* Categories */}
          {allCategories.length > 0 && (
            <section className="filter-sheet-section" aria-labelledby="filter-categories-title">
              <IonNote id="filter-categories-title" className="filter-sheet-section__title">Категории</IonNote>
              <div className="filter-sheet-options">
                {allCategories.filter((category) => !category.hidden).map(categoryOption)}
              </div>
              {hiddenCategories.length > 0 && (
                <details className="filter-sheet-hidden">
                  <summary>Скрытые категории ({hiddenCategories.length}){categoryIds.some((id) => hiddenCategories.some((c) => c.id === id)) && ` · выбрано: ${hiddenCategories.filter((c) => categoryIds.includes(c.id)).length}`}</summary>
                  <div className="filter-sheet-options">{hiddenCategories.map(categoryOption)}</div>
                </details>
              )}
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
                {tags.filter((tag) => !tag.hidden).map(tagOption)}
              </div>
              {hiddenTags.length > 0 && (
                <details className="filter-sheet-hidden">
                  <summary>Скрытые теги ({hiddenTags.length}){tagIds.some((id) => hiddenTags.some((tag) => tag.id === id)) && ` · выбрано: ${hiddenTags.filter((tag) => tagIds.includes(tag.id)).length}`}</summary>
                  <div className="filter-sheet-options">{hiddenTags.map(tagOption)}</div>
                </details>
              )}
            </section>
          )}

          </IonContent>

          <IonFooter className="filter-sheet-footer">
            <div className="filter-sheet-footer-actions">
              <IonButton expand="block" fill="outline" onClick={reset}>
                Сбросить
              </IonButton>
              <IonButton expand="block" onClick={apply}>
                Применить
              </IonButton>
            </div>
          </IonFooter>
        </IonPage>
      </IonModal>
    </>
  )
}
