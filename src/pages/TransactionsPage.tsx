import { useCallback, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonNote, IonChip,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonItemGroup, IonItemDivider,
  IonFab, IonFabButton,
  IonSpinner, IonText, IonAlert,
  IonCard, IonCardContent,
  IonSegment, IonSegmentButton,
  IonSelect, IonSelectOption,
} from '@ionic/react'
import {
  addOutline, createOutline, trashOutline,
  arrowDownOutline, arrowUpOutline, swapHorizontalOutline,
  peopleOutline, chevronDownOutline, chevronUpOutline,
  trendingDownOutline, trendingUpOutline,
} from 'ionicons/icons'
import { transactionsApi, type Transaction, type TransactionFilter } from '@/api/transactions'
import { accountsApi, type Account } from '@/api/accounts'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'
import { FilterSheet } from '@/components/FilterSheet'
import { CategoryIcon } from '@/components/CategoryIcon'
import { useAuthStore } from '@/store/authStore'
import { usePeriodStore, type Period, PERIOD_LABELS, computeDateRange, periodLabel } from '@/store/periodStore'
import { EXPENSE_COLORS, INCOME_COLORS } from '@/lib/chartColors'
import { useChartTheme } from '@/lib/useChartTheme'

const TYPE_LABELS: Record<string, string> = {
  expense: 'Расход',
  income: 'Доход',
  transfer: 'Перевод',
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateKey(isoDate: string): string {
  return isoDate.slice(0, 10)
}

function groupByDate(txs: Transaction[]): { dateKey: string; label: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txs) {
    const key = formatDateKey(tx.date)
    const arr = map.get(key) ?? []
    arr.push(tx)
    map.set(key, arr)
  }
  const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
  return keys.map((key) => ({
    dateKey: key,
    label: formatDate(key + 'T00:00:00Z'),
    items: map.get(key)!,
  }))
}

function typeIcon(type: string): string {
  if (type === 'income') return arrowUpOutline
  if (type === 'transfer') return swapHorizontalOutline
  return arrowDownOutline
}

function typeColor(type: string): string {
  if (type === 'income') return 'success'
  if (type === 'transfer') return 'primary'
  return 'danger'
}

function filterFromParams(sp: URLSearchParams): TransactionFilter {
  const f: TransactionFilter = {}
  if (sp.get('account_ids')) f.accountIds = sp.get('account_ids')!.split(',')
  if (sp.get('category_ids')) f.categoryIds = sp.get('category_ids')!.split(',')
  if (sp.get('tag_ids')) f.tagIds = sp.get('tag_ids')!.split(',')
  if (sp.get('tag_mode') === 'and') f.tagMode = 'and'
  if (sp.get('date_from')) f.dateFrom = sp.get('date_from')!
  if (sp.get('date_to')) f.dateTo = sp.get('date_to')!
  return f
}

function filterToParams(f: TransactionFilter): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.accountIds?.length) sp.set('account_ids', f.accountIds.join(','))
  if (f.categoryIds?.length) sp.set('category_ids', f.categoryIds.join(','))
  if (f.tagIds?.length) sp.set('tag_ids', f.tagIds.join(','))
  if (f.tagMode === 'and') sp.set('tag_mode', 'and')
  if (f.dateFrom) sp.set('date_from', f.dateFrom)
  if (f.dateTo) sp.set('date_to', f.dateTo)
  return sp
}

function TransactionItem({
  tx,
  accounts,
  currentUserId,
  onEdit,
  onDelete,
}: {
  tx: Transaction
  accounts: Account[]
  currentUserId: string | undefined
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const account = accounts.find((a) => a.id === tx.accountId)
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null

  const amountSign = tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '−'

  const isShared = account?.accessMode === 'shared'
  const userShare = isShared && currentUserId
    ? tx.shares?.find((s) => s.userId === currentUserId)
    : null
  const isSharedTx = isShared && userShare != null

  const displayAmount = isSharedTx ? userShare!.amount : tx.amount

  const defaultCurrencyDisplay = tx.defaultCurrencyAmount != null && tx.defaultCurrency != null
    ? (isSharedTx && tx.amount > 0
        ? Math.round(userShare!.amount / tx.amount * tx.defaultCurrencyAmount * 100) / 100
        : tx.defaultCurrencyAmount)
    : null

  const formatAmt = (n: number) =>
    n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  return (
    <IonItemSliding>
      <IonItem lines="full">
        <IonIcon
          icon={typeIcon(tx.type)}
          color={typeColor(tx.type)}
          slot="start"
          style={{ fontSize: '20px' }}
        />
        <IonLabel>
          <h3>{tx.description || TYPE_LABELS[tx.type]}</h3>
          <p>
            {account?.name ?? tx.accountId}
            {toAccount ? ` → ${toAccount.name}` : ''}
          </p>
          {tx.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
              {tx.tags.map((t) => (
                <IonChip key={t.id} style={{ height: '22px', fontSize: '11px', margin: 0 }}>
                  #{t.name}
                </IonChip>
              ))}
            </div>
          )}
        </IonLabel>
        <IonNote slot="end" color={typeColor(tx.type)} style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600 }}>
            {isSharedTx && <IonIcon icon={peopleOutline} style={{ fontSize: '12px', marginRight: '2px', verticalAlign: 'middle' }} />}
            {amountSign}{formatAmt(displayAmount)} {tx.currency}
          </div>
          {isSharedTx && (
            <div style={{ fontSize: '10px', opacity: 0.6 }}>
              всего {amountSign}{formatAmt(tx.amount)} {tx.currency}
            </div>
          )}
          {defaultCurrencyDisplay != null && tx.defaultCurrency != null && (
            <div style={{ fontSize: '10px', opacity: 0.6 }}>
              ≈ {formatAmt(defaultCurrencyDisplay)} {tx.defaultCurrency}
            </div>
          )}
        </IonNote>
      </IonItem>
      <IonItemOptions side="end">
        <IonItemOption color="primary" onClick={() => onEdit(tx.id)}>
          <IonIcon slot="icon-only" icon={createOutline} />
        </IonItemOption>
        <IonItemOption color="danger" onClick={() => onDelete(tx.id)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  )
}

export function TransactionsPage() {
  const qc = useQueryClient()
  const location = useLocation()
  const history = useHistory()
  const searchParams = new URLSearchParams(location.search)
  const filter = filterFromParams(searchParams)
  const setFilter = useCallback((f: TransactionFilter) => {
    history.replace({ search: filterToParams(f).toString() })
  }, [history])
  const currentUserId = useAuthStore((s) => s.user?.id)
  const defaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'USD')
  const { period, periodOffset, customFrom, customTo, setPeriod, setPeriodOffset, setCustomFrom, setCustomTo } = usePeriodStore()
  const [showChart, setShowChart] = useState(false)
  const [chartMode, setChartMode] = useState<'expenses' | 'income'>('expenses')
  const [deleteAlertTxId, setDeleteAlertTxId] = useState<string | null>(null)
  const chartTheme = useChartTheme()

  const isCustom = period === 'custom'
  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)

  const effectiveFilter: TransactionFilter = {
    ...filter,
    dateFrom,
    dateTo,
  }

  const analyticsParams: AnalyticsParams = {
    date_from: dateFrom,
    date_to: dateTo,
    currency: defaultCurrency,
    ...(filter.accountIds?.length ? { account_ids: filter.accountIds.join(',') } : {}),
  }

  const { data: byExpense = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'expense', analyticsParams],
    queryFn: () => analyticsApi.byCategory({ ...analyticsParams, type: 'expense' }),
    enabled: showChart,
  })

  const { data: byIncome = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'income', analyticsParams],
    queryFn: () => analyticsApi.byCategory({ ...analyticsParams, type: 'income' }),
    enabled: showChart,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', effectiveFilter],
    queryFn: () => transactionsApi.list(effectiveFilter),
  })

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const grouped = groupByDate(transactions)

  const chartColors = chartMode === 'expenses' ? EXPENSE_COLORS : INCOME_COLORS
  const pieData = (chartMode === 'expenses' ? byExpense : byIncome)
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  const formatAmt = (n: number) =>
    n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Транзакции</IonTitle>
        </IonToolbar>

        {/* Period switcher */}
        <IonToolbar>
          <IonSelect
            aria-label="Период"
            interface="popover"
            value={period}
            onIonChange={(e) => setPeriod(e.detail.value as Period)}
            label="Период"
            labelPlacement="start"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <IonSelectOption key={p} value={p}>
                {PERIOD_LABELS[p]}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* Custom date range */}
        {period === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
            <div>
              <IonNote style={{ fontSize: '12px' }}>С</IonNote>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  width: '100%', borderRadius: '8px', border: '1px solid var(--ion-color-medium)',
                  padding: '8px', fontSize: '14px', background: 'var(--ion-card-background)',
                  color: 'var(--ion-text-color)',
                }}
              />
            </div>
            <div>
              <IonNote style={{ fontSize: '12px' }}>По</IonNote>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  width: '100%', borderRadius: '8px', border: '1px solid var(--ion-color-medium)',
                  padding: '8px', fontSize: '14px', background: 'var(--ion-card-background)',
                  color: 'var(--ion-text-color)',
                }}
              />
            </div>
          </div>
        )}

        {/* Period navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => setPeriodOffset((o) => o - 1)}
            disabled={isCustom}
          >
            ‹
          </IonButton>
          <IonText style={{ fontSize: '14px', fontWeight: 500 }}>
            {periodLabel(period, periodOffset, customFrom, customTo)}
          </IonText>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => setPeriodOffset((o) => o + 1)}
            disabled={isCustom || periodOffset >= 0}
          >
            ›
          </IonButton>
        </div>

        {/* Collapsible pie chart */}
        <IonCard style={{ margin: '0 0 12px 0' }}>
          <IonItem button detail={false} onClick={() => setShowChart((v) => !v)}>
            <IonLabel>Аналитика за период</IonLabel>
            <IonIcon slot="end" icon={showChart ? chevronUpOutline : chevronDownOutline} />
          </IonItem>
          {showChart && (
            <IonCardContent>
              <IonSegment
                value={chartMode}
                onIonChange={(e) => setChartMode(e.detail.value as 'expenses' | 'income')}
                style={{ marginBottom: '12px' }}
              >
                <IonSegmentButton value="expenses">
                  <IonIcon icon={trendingDownOutline} />
                  <IonLabel>Расходы</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="income">
                  <IonIcon icon={trendingUpOutline} />
                  <IonLabel>Доходы</IonLabel>
                </IonSegmentButton>
              </IonSegment>

              {pieData.length === 0 ? (
                <IonText color="medium" style={{ display: 'block', textAlign: 'center', padding: '16px 0', fontSize: '14px' }}>
                  {chartMode === 'expenses' ? 'Нет расходов за период' : 'Нет доходов за период'}
                </IonText>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="amount"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatAmt(value)} contentStyle={chartTheme.tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: '8px' }}>
                    {pieData.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                              background: chartColors[i % chartColors.length],
                            }}
                          />
                          <CategoryIcon
                            value={s.icon}
                            type={chartMode === 'expenses' ? 'expense' : 'income'}
                            size={20}
                          />
                          <span style={{ color: chartTheme.legendColor, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.categoryName}
                          </span>
                        </div>
                        <span style={{ fontWeight: 500 }}>{formatAmt(s.amount)} {defaultCurrency}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </IonCardContent>
          )}
        </IonCard>

        {/* Filter */}
        <div style={{ marginBottom: '12px' }}>
          <FilterSheet value={filter} onChange={setFilter} />
        </div>

        {/* Transaction list */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <IonSpinner />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <IonText color="medium">
              <p>Транзакций нет</p>
            </IonText>
            <IonButton fill="clear" onClick={() => history.push('/transactions/add')}>
              Добавить первую
            </IonButton>
          </div>
        ) : (
          <IonList>
            {grouped.map(({ dateKey, label, items }) => (
              <IonItemGroup key={dateKey}>
                <IonItemDivider sticky>
                  <IonLabel>{label}</IonLabel>
                </IonItemDivider>
                {items.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    tx={tx}
                    accounts={accounts}
                    currentUserId={currentUserId}
                    onEdit={(id) => history.push(`/transactions/${id}/edit`)}
                    onDelete={(id) => setDeleteAlertTxId(id)}
                  />
                ))}
              </IonItemGroup>
            ))}
          </IonList>
        )}

        {/* FAB */}
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => history.push(`/transactions/add${periodOffset !== 0 || period !== 'day' ? `?date=${dateTo}` : ''}`)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Delete confirmation */}
        <IonAlert
          isOpen={deleteAlertTxId !== null}
          onDidDismiss={() => setDeleteAlertTxId(null)}
          header="Удалить транзакцию?"
          message="Это действие нельзя отменить."
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: 'Удалить',
              role: 'destructive',
              handler: () => {
                if (deleteAlertTxId) deleteMutation.mutate(deleteAlertTxId)
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}
