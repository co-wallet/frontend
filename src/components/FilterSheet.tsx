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
  IonFooter,
  IonPage,
} from '@ionic/react'
import { closeOutline, funnelOutline } from 'ionicons/icons'
import { accountsApi, type AccountKind } from '@/api/accounts'
import { AccountIcon } from '@/components/AccountIcon'
import { FilterMultiSelect } from '@/components/FilterMultiSelect'
import { CategoryIcon } from '@/components/CategoryIcon'
import { categoriesApi } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { type TransactionFilter } from '@/api/transactions'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'
import {
  DEFAULT_TRANSACTION_ACCOUNT_KINDS,
  resetTransactionFilter,
  transactionAccountKinds,
  transactionAccountScope,
  transactionAccountScopeFilter,
  transactionFilterAccounts,
  type TransactionAccountScope,
} from '@/lib/accountFilters'

import './FilterSheet.css'

interface FilterSheetProps {
  value: TransactionFilter
  onChange: (f: TransactionFilter) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const ACCESS_OPTIONS = [{ id: 'personal', name: 'Личные' }, { id: 'shared', name: 'Общие' }]

function scopeIds(value: TransactionFilter): string[] {
  const scope = transactionAccountScope(value)
  return scope === 'all' ? [] : [scope]
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
  const [accountScopes, setAccountScopes] = useState<string[]>(scopeIds(value))
  const accountScope: TransactionAccountScope = accountScopes.length === 1
    ? accountScopes[0] as TransactionAccountScope : 'all'
  const [categoryIds, setCategoryIds] = useState<string[]>(value.categoryIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(value.tagIds ?? [])
  const [tagMode, setTagMode] = useState<'or' | 'and'>(value.tagMode ?? 'or')

  useEffect(() => {
    if (open) {
      setAccountIds(value.accountIds ?? [])
      setAccountKinds(value.accountKinds ?? [...DEFAULT_TRANSACTION_ACCOUNT_KINDS])
      setAccountScopes(scopeIds(value))
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

  const categoryGroups = [
    { type: 'expense', title: 'Категории расходов', categories: expenseCategories },
    { type: 'income', title: 'Категории доходов', categories: incomeCategories },
  ]

  const visibleAccounts = transactionFilterAccounts(accounts, {
    accountKinds,
    ...transactionAccountScopeFilter(accountScope),
  })

  const accountOptions = accounts.filter((account) =>
    accountIds.includes(account.id) || visibleAccounts.some((visible) => visible.id === account.id),
  )

  function apply() {
    const f: TransactionFilter = {
      accountKinds,
      ...(value.types?.length ? { types: value.types } : {}),
      ...(value.includeTransferExpenses ? { includeTransferExpenses: true } : {}),
      ...(value.includeTransferIncome === false ? { includeTransferIncome: false } : {}),
    }
    Object.assign(f, transactionAccountScopeFilter(accountScope))
    if (accountIds.length) f.accountIds = accountIds
    if (categoryIds.length) f.categoryIds = categoryIds
    if (tagIds.length) { f.tagIds = tagIds; f.tagMode = tagMode }
    else if (value.withoutTags) f.withoutTags = true
    onChange(f)
    setOpen(false)
  }

  function reset() {
    setAccountIds([])
    setAccountKinds([])
    setAccountScopes([])
    setCategoryIds([])
    setTagIds([])
    setTagMode('or')
    onChange(resetTransactionFilter(value))
    setOpen(false)
  }

  const activeCount = [
    (value.accountIds?.length ?? 0) > 0,
    (value.types?.length ?? 0) > 0,
    transactionAccountKinds(value).length > 0
      && !ACCOUNT_KIND_OPTIONS.every((option) => transactionAccountKinds(value).includes(option.value)),
    transactionAccountScope(value) !== 'all',
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
            <div className="filter-sheet-fields">
              <FilterMultiSelect label="Тип средств" emptyLabel="Все типы средств"
                options={ACCOUNT_KIND_OPTIONS.map((option) => ({ id: option.value, name: option.shortLabel }))}
                selectedIds={accountKinds} onChange={(ids) => setAccountKinds(ids as AccountKind[])} />
              <FilterMultiSelect label="Доступ к счёту" options={ACCESS_OPTIONS}
                selectedIds={accountScopes} onChange={setAccountScopes} />
              <FilterMultiSelect label="Конкретные счета" options={accountOptions}
                selectedIds={accountIds} onChange={setAccountIds} searchLabel="Поиск счетов"
                renderIcon={(account) => <AccountIcon value={account.icon} size={42} />} />
              {categoryGroups.map(({ type, title, categories }) => (
                <FilterMultiSelect key={type} label={title} options={categories}
                  selectedIds={categoryIds.filter((id) => categories.some((category) => category.id === id))}
                  onChange={(ids) => setCategoryIds((previous) => [
                    ...previous.filter((id) => !categories.some((category) => category.id === id)), ...ids,
                  ])}
                  searchLabel={`Поиск категорий ${type === 'expense' ? 'расходов' : 'доходов'}`}
                  hiddenLabel="Скрытые категории"
                  renderIcon={(category) => <CategoryIcon value={category.icon} type={category.type} size={42} />} />
              ))}
              <FilterMultiSelect label="Теги" options={tags}
                selectedIds={tagIds} onChange={setTagIds} searchLabel="Поиск тегов" hiddenLabel="Скрытые теги" />
              <FilterMultiSelect label="Совпадение тегов" singleSelect
                options={[{ id: 'or', name: 'Любой' }, { id: 'and', name: 'Все' }]}
                selectedIds={[tagMode]} onChange={(ids) => setTagMode(ids[0] === 'and' ? 'and' : 'or')} />
            </div>
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
