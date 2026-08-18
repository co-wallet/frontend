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
  IonList,
  IonItem,
  IonLabel,
  IonDatetime,
  IonChip,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonNote,
  IonFooter,
} from '@ionic/react'
import { closeOutline, funnelOutline } from 'ionicons/icons'
import { accountsApi } from '@/api/accounts'
import { AccountIcon } from '@/components/AccountIcon'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { type TransactionFilter } from '@/api/transactions'

interface FilterSheetProps {
  value: TransactionFilter
  onChange: (f: TransactionFilter) => void
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = []
  function walk(items: CategoryNode[]) {
    for (const n of items) {
      result.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return result
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
  const [dateFrom, setDateFrom] = useState(value.dateFrom ?? '')
  const [dateTo, setDateTo] = useState(value.dateTo ?? '')

  useEffect(() => {
    if (open) {
      setAccountIds(value.accountIds ?? [])
      setCategoryIds(value.categoryIds ?? [])
      setTagIds(value.tagIds ?? [])
      setTagMode(value.tagMode ?? 'or')
      setDateFrom(value.dateFrom ?? '')
      setDateTo(value.dateTo ?? '')
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

  const allCategories = [
    ...flattenCategories(expenseTree).map((c) => ({ ...c, typeLabel: 'Расходы' })),
    ...flattenCategories(incomeTree).map((c) => ({ ...c, typeLabel: 'Доходы' })),
  ]

  function apply() {
    const f: TransactionFilter = {}
    if (accountIds.length) f.accountIds = accountIds
    if (categoryIds.length) f.categoryIds = categoryIds
    if (tagIds.length) { f.tagIds = tagIds; f.tagMode = tagMode }
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo
    onChange(f)
    setOpen(false)
  }

  function reset() {
    setAccountIds([])
    setCategoryIds([])
    setTagIds([])
    setTagMode('or')
    setDateFrom('')
    setDateTo('')
    onChange({})
    setOpen(false)
  }

  const activeCount = [
    (value.accountIds?.length ?? 0) > 0,
    (value.categoryIds?.length ?? 0) > 0,
    (value.tagIds?.length ?? 0) > 0,
    !!value.dateFrom || !!value.dateTo,
  ].filter(Boolean).length

  return (
    <>
      <IonButton
        fill={activeCount > 0 ? 'solid' : 'outline'}
        size="small"
        onClick={() => setOpen(true)}
      >
        <IonIcon icon={funnelOutline} slot="start" />
        Фильтры
        {activeCount > 0 && (
          <span
            style={{
              marginLeft: 6,
              background: 'var(--ion-color-primary-contrast)',
              color: 'var(--ion-color-primary)',
              borderRadius: '50%',
              width: 18,
              height: 18,
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {activeCount}
          </span>
        )}
      </IonButton>

      <IonModal
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        breakpoints={[0, 0.5, 1]}
        initialBreakpoint={0.5}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Фильтры</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setOpen(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          {/* Date range */}
          <IonList>
            <IonItem>
              <IonLabel>Период с</IonLabel>
              <IonDatetime
                presentation="date"
                preferWheel={true}
                value={dateFrom || undefined}
                onIonChange={(e) => {
                  const val = e.detail.value
                  setDateFrom(typeof val === 'string' ? val.slice(0, 10) : '')
                }}
                style={{ maxWidth: 180 }}
              />
            </IonItem>
            <IonItem>
              <IonLabel>Период по</IonLabel>
              <IonDatetime
                presentation="date"
                preferWheel={true}
                value={dateTo || undefined}
                onIonChange={(e) => {
                  const val = e.detail.value
                  setDateTo(typeof val === 'string' ? val.slice(0, 10) : '')
                }}
                style={{ maxWidth: 180 }}
              />
            </IonItem>
          </IonList>

          {/* Accounts */}
          {accounts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <IonNote style={{ paddingLeft: 16, fontWeight: 600, fontSize: 14 }}>Счета</IonNote>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px' }}>
                {accounts.map((a) => (
                  <IonChip
                    key={a.id}
                    color={accountIds.includes(a.id) ? 'primary' : undefined}
                    outline={!accountIds.includes(a.id)}
                    onClick={() => setAccountIds((prev) => toggle(prev, a.id))}
                  >
                    <AccountIcon value={a.icon} size={22} />
                    {a.name}
                  </IonChip>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {allCategories.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <IonNote style={{ paddingLeft: 16, fontWeight: 600, fontSize: 14 }}>Категории</IonNote>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px' }}>
                {allCategories.map((c) => (
                  <IonChip
                    key={c.id}
                    color={categoryIds.includes(c.id) ? 'primary' : undefined}
                    outline={!categoryIds.includes(c.id)}
                    onClick={() => setCategoryIds((prev) => toggle(prev, c.id))}
                  >
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </IonChip>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
                <IonNote style={{ fontWeight: 600, fontSize: 14 }}>Теги</IonNote>
                <IonSegment
                  value={tagMode}
                  onIonChange={(e) => setTagMode(e.detail.value as 'or' | 'and')}
                  style={{ maxWidth: 120 }}
                >
                  <IonSegmentButton value="or">OR</IonSegmentButton>
                  <IonSegmentButton value="and">AND</IonSegmentButton>
                </IonSegment>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px' }}>
                {tags.map((t) => (
                  <IonChip
                    key={t.id}
                    color={tagIds.includes(t.id) ? 'primary' : undefined}
                    outline={!tagIds.includes(t.id)}
                    onClick={() => setTagIds((prev) => toggle(prev, t.id))}
                  >
                    #{t.name}
                  </IonChip>
                ))}
              </div>
            </div>
          )}
        </IonContent>

        <IonFooter>
          <IonToolbar>
            <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
              <IonButton expand="block" fill="outline" color="medium" onClick={reset} style={{ flex: 1 }}>
                Сбросить
              </IonButton>
              <IonButton expand="block" onClick={apply} style={{ flex: 1 }}>
                Применить
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      </IonModal>
    </>
  )
}
