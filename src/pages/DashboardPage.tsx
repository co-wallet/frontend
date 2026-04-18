import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonMenuButton,
  IonItem,
  IonList,
  IonNote,
  IonText,
} from '@ionic/react'
import {
  logOutOutline,
  addOutline,
  walletOutline,
  listOutline,
  pricetagOutline,
  trendingDownOutline,
  trendingUpOutline,
  analyticsOutline,
  gridOutline,
  chevronDownOutline,
  chevronUpOutline,
  shieldCheckmarkOutline,
  optionsOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/store/authStore'
import { usePeriodStore, type Period, PERIOD_LABELS, computeDateRange } from '@/store/periodStore'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'
import { accountsApi } from '@/api/accounts'
import { currenciesApi, type Currency } from '@/api/currencies'
import { authApi } from '@/api/auth'

type ChartMode = 'balance' | 'expenses' | 'income'
type AccountFilter = 'balance' | 'all' | 'custom'

import { BALANCE_COLORS, EXPENSE_COLORS, INCOME_COLORS } from '@/lib/chartColors'

function formatAmount(n: number, symbol?: string): string {
  const num = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  return symbol ? `${symbol} ${num}` : num
}

interface PieEntry {
  name: string
  amount: number
  icon?: string
}

const LEGEND_PAGE_SIZE = 5

function ChartBlock({
  data,
  sym,
  emptyText,
  colors,
}: {
  data: PieEntry[]
  sym: string
  emptyText: string
  colors: string[]
}) {
  const [visibleCount, setVisibleCount] = useState(LEGEND_PAGE_SIZE)
  const positive = data.filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount)
  const negative = data.filter((d) => d.amount < 0).sort((a, b) => a.amount - b.amount)
  const zero = data.filter((d) => d.amount === 0)
  const allEntries = [...positive, ...negative, ...zero]
  const visibleEntries = allEntries.slice(0, visibleCount)

  if (data.length === 0) {
    return (
      <IonText color="medium" style={{ display: 'block', textAlign: 'center', padding: '24px 0', fontSize: '0.875rem' }}>
        {emptyText}
      </IonText>
    )
  }
  return (
    <>
      {positive.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={positive}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
            >
              {positive.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatAmount(value, sym)}
              labelFormatter={(label) => String(label)}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div style={{ marginTop: 8 }}>
        {visibleEntries.map((s, i) => {
          const isNegative = s.amount < 0
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', padding: '2px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isNegative ? '#f87171' : colors[i % colors.length],
                  }}
                />
                <span style={{ color: 'var(--ion-color-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {s.icon ? `${s.icon} ` : ''}{s.name}
                </span>
              </div>
              <span style={{ fontWeight: 500, color: isNegative ? 'var(--ion-color-danger)' : undefined }}>
                {formatAmount(s.amount, sym)}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
        {visibleCount < allEntries.length && (
          <IonButton fill="clear" size="small" onClick={() => setVisibleCount((n) => n + LEGEND_PAGE_SIZE)}>
            Показать ещё ({allEntries.length - visibleCount})
          </IonButton>
        )}
        {visibleCount > LEGEND_PAGE_SIZE && (
          <IonButton fill="clear" size="small" color="medium" onClick={() => setVisibleCount(LEGEND_PAGE_SIZE)}>
            Свернуть
          </IonButton>
        )}
      </div>
    </>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const updateUser = useAuthStore((s) => s.updateUser)
  const history = useHistory()

  const { period, customFrom, customTo, setPeriod, setCustomFrom, setCustomTo } = usePeriodStore()
  const [displayCurrency, setDisplayCurrency] = useState(user?.defaultCurrency ?? 'USD')
  const [chartMode, setChartMode] = useState<ChartMode>('balance')
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('balance')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [showAccountFilter, setShowAccountFilter] = useState(false)

  const saveCurrency = useMutation({
    mutationFn: (code: string) => authApi.updateMe(code),
    onSuccess: (updatedUser) => updateUser(updatedUser),
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', displayCurrency],
    queryFn: () => accountsApi.list(displayCurrency),
  })

  const filteredAccountIds: string | undefined = (() => {
    if (accountFilter === 'all') return undefined
    if (accountFilter === 'custom') {
      return selectedAccountIds.length > 0 ? selectedAccountIds.join(',') : undefined
    }
    const ids = accounts.filter((a) => a.includeInBalance).map((a) => a.id)
    return ids.length > 0 ? ids.join(',') : undefined
  })()

  const isEmptyCustom = accountFilter === 'custom' && selectedAccountIds.length === 0

  const { dateFrom, dateTo } = computeDateRange(period, 0, customFrom, customTo)
  const params: AnalyticsParams = { date_from: dateFrom, date_to: dateTo, currency: displayCurrency, account_ids: filteredAccountIds }

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies', displayCurrency],
    queryFn: () => currenciesApi.list([displayCurrency]),
    staleTime: 60_000,
  })

  const selectedCurrency: Currency | undefined = currencies.find((c) => c.code === displayCurrency)
  const sym = selectedCurrency?.symbol ?? displayCurrency

  const { data: summaryRaw } = useQuery({
    queryKey: ['analytics', 'summary', params],
    queryFn: () => analyticsApi.summary(params),
    enabled: !isEmptyCustom,
  })

  const { data: byExpenseRaw = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'expense', params],
    queryFn: () => analyticsApi.byCategory({ ...params, type: 'expense' }),
    enabled: !isEmptyCustom,
  })

  const { data: byIncomeRaw = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'income', params],
    queryFn: () => analyticsApi.byCategory({ ...params, type: 'income' }),
    enabled: !isEmptyCustom,
  })

  const { data: byTagRaw = [] } = useQuery({
    queryKey: ['analytics', 'by-tag', params],
    queryFn: () => analyticsApi.byTag(params),
    enabled: !isEmptyCustom,
  })

  const summary = isEmptyCustom ? { balance: 0, expenses: 0, income: 0 } : summaryRaw
  const byExpense = isEmptyCustom ? [] : byExpenseRaw
  const byIncome = isEmptyCustom ? [] : byIncomeRaw
  const byTag = isEmptyCustom ? [] : byTagRaw

  const handleLogout = () => {
    logout()
    history.replace('/login')
  }

  const filteredAccounts = accountFilter === 'all'
    ? accounts
    : accountFilter === 'custom'
      ? accounts.filter((a) => selectedAccountIds.includes(a.id))
      : accounts.filter((a) => a.includeInBalance)

  const balancePieData: PieEntry[] = filteredAccounts
    .filter((a) => a.balance != null)
    .map((a) => ({ name: a.name, icon: a.icon ?? undefined, amount: a.balance!.display }))

  const expensePieData: PieEntry[] = byExpense
    .filter((s) => s.amount > 0)
    .slice(0, 8)
    .map((s) => ({ name: s.categoryName, icon: s.icon ?? undefined, amount: s.amount }))

  const incomePieData: PieEntry[] = byIncome
    .filter((s) => s.amount > 0)
    .slice(0, 8)
    .map((s) => ({ name: s.categoryName, icon: s.icon ?? undefined, amount: s.amount }))

  const chartTitles: Record<ChartMode, string> = {
    balance: 'Баланс по счетам',
    expenses: 'Расходы по категориям',
    income: 'Доходы по категориям',
  }

  const chartEmptyTexts: Record<ChartMode, string> = {
    balance: 'Нет данных о балансе',
    expenses: 'Нет расходов за период',
    income: 'Нет доходов за период',
  }

  const activePieData =
    chartMode === 'balance' ? balancePieData :
    chartMode === 'expenses' ? expensePieData :
    incomePieData

  const navItems: { icon: string; label: string; href: string }[] = [
    { icon: walletOutline, label: 'Счета', href: '/accounts' },
    { icon: listOutline, label: 'Транзакции', href: '/transactions' },
    { icon: pricetagOutline, label: 'Теги', href: '/tags' },
    { icon: gridOutline, label: 'Категории', href: '/categories' },
  ]

  const summaryCards: { mode: ChartMode; icon: string; label: string; value: number; color: string }[] = [
    { mode: 'balance', icon: analyticsOutline, label: 'Баланс', value: summary?.balance ?? 0, color: 'primary' },
    { mode: 'expenses', icon: trendingDownOutline, label: 'Расходы', value: summary?.expenses ?? 0, color: 'danger' },
    { mode: 'income', icon: trendingUpOutline, label: 'Доходы', value: summary?.income ?? 0, color: 'success' },
  ]

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>co-wallet</IonTitle>
          <IonButtons slot="end">
            <IonSelect
              aria-label="Валюта"
              interface="popover"
              value={displayCurrency}
              onIonChange={(e) => {
                const code = e.detail.value as string
                if (code && code !== displayCurrency) {
                  setDisplayCurrency(code)
                  saveCurrency.mutate(code)
                }
              }}
              style={{ maxWidth: 110 }}
            >
              {currencies.map((c) => (
                <IonSelectOption key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </IonSelectOption>
              ))}
            </IonSelect>
            <IonButton onClick={handleLogout} aria-label="Выйти">
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {/* Period switcher */}
          <IonList style={{ marginBottom: 8 }}>
            <IonItem>
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
            </IonItem>
          </IonList>

          {/* Custom date range */}
          {period === 'custom' && (
            <IonList style={{ marginBottom: 8 }}>
              <IonItem>
                <IonLabel position="stacked">С</IonLabel>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ion-text-color)',
                    fontSize: '0.875rem',
                    padding: '8px 0',
                  }}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">По</IonLabel>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ion-text-color)',
                    fontSize: '0.875rem',
                    padding: '8px 0',
                  }}
                />
              </IonItem>
            </IonList>
          )}

          {/* Account filter */}
          <div style={{ marginBottom: 16, marginTop: 12 }}>
            <IonItem button detail={false} onClick={() => setShowAccountFilter((v) => !v)}>
              <IonIcon icon={optionsOutline} slot="start" />
              <IonLabel>
                {accountFilter === 'balance' && 'Счета в балансе'}
                {accountFilter === 'all' && 'Все счета'}
                {accountFilter === 'custom' && (selectedAccountIds.length > 0
                  ? `Выбрано: ${selectedAccountIds.length}`
                  : 'Выбрать счета'
                )}
              </IonLabel>
              <IonIcon icon={showAccountFilter ? chevronUpOutline : chevronDownOutline} slot="end" />
            </IonItem>
            {showAccountFilter && (
              <div style={{ marginTop: 8 }}>
                <IonSegment
                  value={accountFilter}
                  onIonChange={(e) => setAccountFilter(e.detail.value as AccountFilter)}
                >
                  <IonSegmentButton value="balance"><IonLabel>В балансе</IonLabel></IonSegmentButton>
                  <IonSegmentButton value="all"><IonLabel>Все</IonLabel></IonSegmentButton>
                  <IonSegmentButton value="custom"><IonLabel>Выбрать</IonLabel></IonSegmentButton>
                </IonSegment>
                {accountFilter === 'custom' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 8 }}>
                    {accounts.map((a) => {
                      const active = selectedAccountIds.includes(a.id)
                      return (
                        <IonChip
                          key={a.id}
                          color={active ? 'primary' : 'medium'}
                          outline={!active}
                          onClick={() => setSelectedAccountIds((prev) =>
                            prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                          )}
                        >
                          <IonLabel>{a.icon ? `${a.icon} ` : ''}{a.name}</IonLabel>
                        </IonChip>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {summaryCards.map((card) => (
              <IonCard
                key={card.mode}
                button
                onClick={() => setChartMode(card.mode)}
                color={chartMode === card.mode ? card.color : undefined}
                style={{ margin: 0 }}
              >
                <IonCardContent className="ion-padding">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <IonIcon icon={card.icon} style={{ fontSize: 14 }} />
                    <span style={{ fontSize: '0.75rem' }}>{card.label}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {formatAmount(card.value, sym)}
                  </p>
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          {/* Pie chart block */}
          <IonCard style={{ margin: '0 0 16px 0' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '0.875rem' }}>{chartTitles[chartMode]}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <ChartBlock
                data={activePieData}
                sym={sym}
                emptyText={chartEmptyTexts[chartMode]}
                colors={chartMode === 'expenses' ? EXPENSE_COLORS : chartMode === 'income' ? INCOME_COLORS : BALANCE_COLORS}
              />
            </IonCardContent>
          </IonCard>

          {/* Tags breakdown */}
          {byTag.length > 0 && (
            <IonCard style={{ margin: '0 0 16px 0' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '0.875rem' }}>Расходы по тегам</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {byTag.slice(0, 6).map((s) => (
                    <IonItem key={s.tagId} lines="none" style={{ '--min-height': '32px' } as React.CSSProperties}>
                      <IonLabel color="medium" style={{ fontSize: '0.75rem' }}>#{s.tagName}</IonLabel>
                      <IonNote slot="end" style={{ fontSize: '0.75rem', fontWeight: 500 }}>{formatAmount(s.amount, sym)}</IonNote>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>
          )}

          {/* Navigation tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {navItems.map((item) => (
              <IonCard key={item.href} button routerLink={item.href} style={{ margin: 0 }}>
                <IonCardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
                  <IonIcon icon={item.icon} style={{ fontSize: 24 }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
                </IonCardContent>
              </IonCard>
            ))}
            {user?.isAdmin && (
              <IonCard button routerLink="/admin" style={{ margin: 0, gridColumn: 'span 2' }}>
                <IonCardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
                  <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 24 }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Администрирование</span>
                </IonCardContent>
              </IonCard>
            )}
          </div>

          {/* Greeting */}
          <IonCard style={{ margin: '12px 0 0 0' }}>
            <IonCardContent>
              <IonText color="medium" style={{ fontSize: '0.75rem' }}>
                {user?.username}  ·  {user?.email}
              </IonText>
            </IonCardContent>
          </IonCard>
        </div>

        {/* FAB */}
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton routerLink="/transactions/add">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  )
}
