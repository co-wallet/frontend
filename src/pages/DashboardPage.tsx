import { useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Wallet, List, Tag, TrendingDown, TrendingUp, Scale, LayoutList, ChevronDown, ChevronUp, ShieldCheck, SlidersHorizontal } from 'lucide-react'
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
} from '@ionic/react'
import { logOutOutline, addOutline } from 'ionicons/icons'
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
      <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
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
      <div className="mt-2 space-y-1">
        {visibleEntries.map((s, i) => {
          const isNegative = s.amount < 0
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: isNegative ? '#f87171' : colors[i % colors.length] }}
                />
                <span className="text-muted-foreground truncate max-w-[160px]">
                  {s.icon ? `${s.icon} ` : ''}{s.name}
                </span>
              </div>
              <span className={`font-medium ${isNegative ? 'text-red-500' : ''}`}>{formatAmount(s.amount, sym)}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-3">
        {visibleCount < allEntries.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + LEGEND_PAGE_SIZE)}
            className="text-xs text-primary hover:underline"
          >
            Показать ещё ({allEntries.length - visibleCount})
          </button>
        )}
        {visibleCount > LEGEND_PAGE_SIZE && (
          <button
            type="button"
            onClick={() => setVisibleCount(LEGEND_PAGE_SIZE)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Свернуть
          </button>
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

  // Build account_ids for analytics filter
  const filteredAccountIds: string | undefined = (() => {
    if (accountFilter === 'all') return undefined
    if (accountFilter === 'custom') {
      return selectedAccountIds.length > 0 ? selectedAccountIds.join(',') : undefined
    }
    // 'balance' — only accounts included in balance
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
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
        <div className="max-w-lg mx-auto">
          {/* Period switcher — dropdown (6 labels не помещаются в сегмент) */}
          <div className="mb-2 rounded-md border bg-card">
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
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">С</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-card"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">По</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-card"
                />
              </div>
            </div>
          )}

          {/* Account filter */}
          <div className="mb-4 mt-3">
            <button
              onClick={() => setShowAccountFilter((v) => !v)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border bg-card hover:bg-muted w-full justify-between"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal size={14} />
                {accountFilter === 'balance' && 'Счета в балансе'}
                {accountFilter === 'all' && 'Все счета'}
                {accountFilter === 'custom' && (selectedAccountIds.length > 0
                  ? `Выбрано: ${selectedAccountIds.length}`
                  : 'Выбрать счета'
                )}
              </span>
              {showAccountFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAccountFilter && (
              <div className="mt-2 space-y-2">
                <IonSegment
                  value={accountFilter}
                  onIonChange={(e) => setAccountFilter(e.detail.value as AccountFilter)}
                >
                  <IonSegmentButton value="balance"><IonLabel>В балансе</IonLabel></IonSegmentButton>
                  <IonSegmentButton value="all"><IonLabel>Все</IonLabel></IonSegmentButton>
                  <IonSegmentButton value="custom"><IonLabel>Выбрать</IonLabel></IonSegmentButton>
                </IonSegment>
                {accountFilter === 'custom' && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
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

          {/* Summary cards — clickable to switch chart */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <IonCard
              button
              onClick={() => setChartMode('balance')}
              color={chartMode === 'balance' ? 'primary' : undefined}
              className="m-0"
            >
              <IonCardContent className="ion-padding">
                <div className="flex items-center gap-1 mb-1">
                  <Scale size={14} />
                  <span className="text-xs">Баланс</span>
                </div>
                <p className="text-sm font-semibold truncate">{formatAmount(summary?.balance ?? 0, sym)}</p>
              </IonCardContent>
            </IonCard>
            <IonCard
              button
              onClick={() => setChartMode('expenses')}
              color={chartMode === 'expenses' ? 'danger' : undefined}
              className="m-0"
            >
              <IonCardContent className="ion-padding">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown size={14} />
                  <span className="text-xs">Расходы</span>
                </div>
                <p className="text-sm font-semibold truncate">{formatAmount(summary?.expenses ?? 0, sym)}</p>
              </IonCardContent>
            </IonCard>
            <IonCard
              button
              onClick={() => setChartMode('income')}
              color={chartMode === 'income' ? 'success' : undefined}
              className="m-0"
            >
              <IonCardContent className="ion-padding">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={14} />
                  <span className="text-xs">Доходы</span>
                </div>
                <p className="text-sm font-semibold truncate">{formatAmount(summary?.income ?? 0, sym)}</p>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Pie chart block */}
          <IonCard className="m-0 mb-4">
            <IonCardHeader>
              <IonCardTitle className="text-sm">{chartTitles[chartMode]}</IonCardTitle>
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
            <IonCard className="m-0 mb-4">
              <IonCardHeader>
                <IonCardTitle className="text-sm">Расходы по тегам</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="space-y-2">
                  {byTag.slice(0, 6).map((s) => (
                    <div key={s.tagId} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">#{s.tagName}</span>
                      <span className="font-medium">{formatAmount(s.amount, sym)}</span>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Navigation tiles */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/accounts" className="contents">
              <IonCard button className="m-0">
                <IonCardContent className="flex flex-col items-center gap-2 ion-padding">
                  <Wallet size={24} />
                  <span className="text-sm font-medium">Счета</span>
                </IonCardContent>
              </IonCard>
            </Link>
            <Link to="/transactions" className="contents">
              <IonCard button className="m-0">
                <IonCardContent className="flex flex-col items-center gap-2 ion-padding">
                  <List size={24} />
                  <span className="text-sm font-medium">Транзакции</span>
                </IonCardContent>
              </IonCard>
            </Link>
            <Link to="/tags" className="contents">
              <IonCard button className="m-0">
                <IonCardContent className="flex flex-col items-center gap-2 ion-padding">
                  <Tag size={24} />
                  <span className="text-sm font-medium">Теги</span>
                </IonCardContent>
              </IonCard>
            </Link>
            <Link to="/categories" className="contents">
              <IonCard button className="m-0">
                <IonCardContent className="flex flex-col items-center gap-2 ion-padding">
                  <LayoutList size={24} />
                  <span className="text-sm font-medium">Категории</span>
                </IonCardContent>
              </IonCard>
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className="contents col-span-2">
                <IonCard button className="m-0 col-span-2">
                  <IonCardContent className="flex flex-col items-center gap-2 ion-padding">
                    <ShieldCheck size={24} />
                    <span className="text-sm font-medium">Администрирование</span>
                  </IonCardContent>
                </IonCard>
              </Link>
            )}
          </div>

          {/* Greeting */}
          <IonCard className="m-0 mt-3">
            <IonCardContent className="text-xs text-muted-foreground">
              {user?.username}  ·  {user?.email}
            </IonCardContent>
          </IonCard>
        </div>

        {/* FAB */}
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => history.push('/transactions/add')}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  )
}
