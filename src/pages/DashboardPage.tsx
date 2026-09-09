import { RecentTransactions } from '@/components/RecentTransactions'
import { PeriodControl } from '@/components/PeriodControl'
import { PieChartTooltip } from '@/components/PieChartTooltip'
import { usePieChartTooltip } from '@/lib/usePieChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppContent } from '@/components/layout/AppContent'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  IonPage,
  IonCheckbox,
  IonPopover,
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
  IonItem,
  IonList,
  IonNote,
  IonText,
} from '@ionic/react'
import {
  addOutline,
  trendingDownOutline,
  trendingUpOutline,
  analyticsOutline,
  optionsOutline,
  swapHorizontalOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/store/authStore'
import { usePeriodStore, computeDateRange } from '@/store/periodStore'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'
import { accountsApi, type AccountKind } from '@/api/accounts'
import { currenciesApi, type Currency } from '@/api/currencies'
import { authApi } from '@/api/auth'
import { AccountIcon, accountIconStyle } from '@/components/AccountIcon'
import { CategoryIcon, UNCATEGORIZED_CATEGORY_ICON } from '@/components/CategoryIcon'
import { ACCOUNT_KIND_OPTIONS, accountKindShortLabel } from '@/lib/accountKind'
import {
  filterAccountsByKinds,
  selectedVisibleAccountIds,
} from '@/lib/accountFilters'
import {
  dashboardEntryColor,
  prepareDashboardChart,
  type DashboardPieEntry,
} from '@/lib/dashboardChart'

import { filteredTransactionsHref } from '@/lib/transactionNavigation'

import './DashboardPage.css'

type ChartMode = 'balance' | 'expenses' | 'income'
type AccountFilter = 'all' | 'custom'

import { useChartTheme } from '@/lib/useChartTheme'

function formatAmount(n: number, symbol?: string): string {
  const num = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  return symbol ? `${symbol} ${num}` : num
}

const LEGEND_PAGE_SIZE = 5

function ChartBlock({
  data,
  sym,
  emptyText,
  tooltipStyle,
  legendColor,
}: {
  data: DashboardPieEntry[]
  sym: string
  emptyText: string
  tooltipStyle: React.CSSProperties
  legendColor: string
}) {
  const [visibleCount, setVisibleCount] = useState(LEGEND_PAGE_SIZE)
  const tooltip = usePieChartTooltip()
  const { chartEntries, legendEntries } = prepareDashboardChart(data)
  const visibleEntries = legendEntries.slice(0, visibleCount)

  if (data.length === 0) {
    return (
      <IonText color="medium" style={{ display: 'block', textAlign: 'center', padding: '24px 0', fontSize: '0.875rem' }}>
        {emptyText}
      </IonText>
    )
  }
  return (
    <>
      {chartEntries.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartEntries}
              dataKey="chartAmount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              onClick={tooltip.onSectorClick}
            >
              {chartEntries.map((entry, i) => (
                <Cell
                  key={`${entry.name}-${i}`}
                  fill={dashboardEntryColor(entry)}
                />
              ))}
            </Pie>
            <Tooltip
              trigger={tooltip.trigger}
              active={tooltip.active}
              contentStyle={tooltipStyle}
              content={<PieChartTooltip formatAmount={(amount) => formatAmount(amount, sym)} />}
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
                    background: dashboardEntryColor(s),
                  }}
                />
                {s.iconType === 'account' && (
                  <AccountIcon value={s.icon} size={20} shape="rectangle" />
                )}
                {s.iconType === 'transfer' && (
                  <span
                    className="account-icon"
                    role="img"
                    aria-label="Перевод"
                    style={accountIconStyle({ foreground: 'blue', border: 'blue' }, 20, 'square')}
                  >
                    <IonIcon icon={swapHorizontalOutline} aria-hidden="true" style={{ fontSize: 12 }} />
                  </span>
                )}
                {s.iconType === 'category' && (
                  <CategoryIcon value={s.icon} type={s.categoryType} size={20} />
                )}
                <span style={{ color: legendColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: s.iconType === 'transfer' ? 'normal' : 'nowrap', overflowWrap: 'anywhere', maxWidth: 160 }}>
                  {s.name}
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
        {visibleCount < legendEntries.length && (
          <IonButton fill="clear" size="small" onClick={() => setVisibleCount((n) => n + LEGEND_PAGE_SIZE)}>
            Показать ещё ({legendEntries.length - visibleCount})
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
  const updateUser = useAuthStore((s) => s.updateUser)

  const { period, periodOffset, customFrom, customTo, setPeriod, setPeriodOffset, setCustomFrom, setCustomTo } = usePeriodStore()
  const [displayCurrency, setDisplayCurrency] = useState(user?.defaultCurrency ?? 'USD')
  const [chartMode, setChartMode] = useState<ChartMode>('balance')
  const [transferVisibility, setTransferVisibility] = useState({ expenses: false, income: true })
  const [includeShared, setIncludeShared] = useState(false)
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')
  const [selectedKinds, setSelectedKinds] = useState<AccountKind[]>(['spending'])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])

  const saveCurrency = useMutation({
    mutationFn: (code: string) => authApi.updateMe(code),
    onSuccess: (updatedUser) => updateUser(updatedUser),
  })
  const { data: accounts = [], isLoading: accountsLoading, isError: accountsError } = useQuery({
    queryKey: ['accounts', displayCurrency],
    queryFn: () => accountsApi.list(displayCurrency),
  })

  const kindFilteredAccounts = filterAccountsByKinds(accounts, selectedKinds)
    .filter((account) => includeShared || account.accessMode !== 'shared')
  const effectiveSelectedAccountIds = selectedVisibleAccountIds(kindFilteredAccounts, selectedAccountIds)

  const filteredAccounts = accountFilter === 'all'
    ? kindFilteredAccounts
    : kindFilteredAccounts.filter((account) => effectiveSelectedAccountIds.includes(account.id))
  const filteredAccountIds = filteredAccounts.map((account) => account.id).join(',') || undefined
  const hasAnalyticsAccounts = !accountsLoading && !accountsError && filteredAccounts.length > 0

  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)
  const params: AnalyticsParams = {
    include_transfer_expenses: transferVisibility.expenses,
    include_transfer_income: transferVisibility.income,
    date_from: dateFrom,
    date_to: dateTo,
    currency: displayCurrency,
    account_ids: filteredAccountIds,
    account_kinds: selectedKinds.join(','),
  }

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
    enabled: hasAnalyticsAccounts,
  })

  const { data: byExpenseRaw = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'expense', params],
    queryFn: () => analyticsApi.byCategory({ ...params, type: 'expense' }),
    enabled: hasAnalyticsAccounts,
  })

  const { data: byIncomeRaw = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'income', params],
    queryFn: () => analyticsApi.byCategory({ ...params, type: 'income' }),
    enabled: hasAnalyticsAccounts,
  })

  const tagParams: AnalyticsParams = { ...params, type: chartMode === 'income' ? 'income' : 'expense' }

  const { data: byTagRaw = [] } = useQuery({
    queryKey: ['analytics', 'by-tag', tagParams],
    queryFn: () => analyticsApi.byTag(tagParams),
    enabled: chartMode !== 'balance' && hasAnalyticsAccounts,
  })

  const summary = !hasAnalyticsAccounts ? { balance: 0, expenses: 0, income: 0 } : summaryRaw
  const byExpense = !hasAnalyticsAccounts ? [] : byExpenseRaw
  const byIncome = !hasAnalyticsAccounts ? [] : byIncomeRaw
  const byTag = !hasAnalyticsAccounts ? [] : byTagRaw

  const balancePieData: DashboardPieEntry[] = filteredAccounts
    .filter((a) => a.balance != null)
    .map((a) => ({
      name: a.name,
      icon: a.icon ?? undefined,
      iconType: 'account' as const,
      amount: a.balance!.display,
    }))

  const expensePieData: DashboardPieEntry[] = byExpense
    .filter((s) => s.amount > 0)
    .map((s) => ({
      name: s.categoryName,
      icon: s.categoryId === 'uncategorized' ? UNCATEGORIZED_CATEGORY_ICON : s.icon ?? undefined,
      iconType: s.categoryId.startsWith('transfers:') || s.categoryId === 'transfers' ? 'transfer' as const : 'category' as const,
      categoryType: 'expense',
      amount: s.amount,
    }))

  const incomePieData: DashboardPieEntry[] = byIncome
    .filter((s) => s.amount > 0)
    .map((s) => ({
      name: s.categoryName,
      icon: s.categoryId === 'uncategorized' ? UNCATEGORIZED_CATEGORY_ICON : s.icon ?? undefined,
      iconType: s.categoryId.startsWith('transfers:') || s.categoryId === 'transfers' ? 'transfer' as const : 'category' as const,
      categoryType: 'income',
      amount: s.amount,
    }))

  const chartTitles: Record<ChartMode, string> = {
    balance: 'Баланс по счетам',
    expenses: 'Расходы по категориям',
    income: 'Доходы по категориям',
  }

  const chartSettingsLabels: Record<ChartMode, string> = {
    balance: 'Настройки баланса',
    expenses: 'Настройки расходов',
    income: 'Настройки доходов',
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

  const chartTheme = useChartTheme()

  const summaryCards: { mode: ChartMode; icon: string; label: string; value: number; color: string }[] = [
    {
      mode: 'balance',
      icon: analyticsOutline,
      label: selectedKinds.length === 1 && selectedKinds[0] === 'spending' ? 'Доступно' : 'Баланс',
      value: summary?.balance ?? 0,
      color: 'primary',
    },
    { mode: 'expenses', icon: trendingDownOutline, label: 'Расходы', value: summary?.expenses ?? 0, color: 'danger' },
    { mode: 'income', icon: trendingUpOutline, label: 'Доходы', value: summary?.income ?? 0, color: 'success' },
  ]

  return (
    <IonPage>
      <PageHeader title="co-wallet" backHref={false} />

      <AppContent fullscreen withFab
        className={chartMode === 'balance' ? 'dashboard-balance-content' : undefined}
        fixed={
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton routerLink="/transactions/add">
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        }
      >
        <div>
          <section className="dashboard-view-controls" aria-label="Параметры отображения">
            {/* Account filter */}
            <div className="dashboard-account-filter">
              <IonSelect
                aria-label="Тип средств"
                interface="popover"
                multiple
                value={selectedKinds}
                onIonChange={(event) => {
                  const kinds = event.detail.value as AccountKind[]
                  setSelectedKinds(kinds)
                }}
                selectedText={selectedKinds.length === 0 ? 'Типы не выбраны' : selectedKinds.length === 1
                  ? accountKindShortLabel(selectedKinds[0])
                  : selectedKinds.length === ACCOUNT_KIND_OPTIONS.length
                    ? 'Все типы средств'
                    : `Типов средств: ${selectedKinds.length}`}
                className="dashboard-currency-select"
              >
                {ACCOUNT_KIND_OPTIONS.map((option) => (
                  <IonSelectOption key={option.value} value={option.value}>
                    {option.shortLabel}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonButton
                id="dashboard-account-settings"
                className="dashboard-account-settings"
                fill="outline"
                color="medium"
                aria-label={accountFilter === 'custom'
                  ? `Выбрано счетов: ${effectiveSelectedAccountIds.length}`
                  : includeShared ? 'Все счета' : 'Личные счета'}
                aria-haspopup="dialog"
              >
                <IonIcon slot="icon-only" icon={optionsOutline} />
              </IonButton>
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
                selectedText={displayCurrency}
                className="dashboard-currency-select"
              >
                {currencies.map((c) => (
                  <IonSelectOption key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonPopover trigger="dashboard-account-settings" className="dashboard-chart-popover" aria-label="Фильтр счетов">
                <div className="dashboard-chart-popover-content">
                  <IonText color="medium" style={{ fontSize: '0.75rem' }}>Счета</IonText>
                  <IonSegment
                    value={accountFilter}
                    onIonChange={(e) => setAccountFilter(e.detail.value as AccountFilter)}
                  >
                    <IonSegmentButton value="all"><IonLabel>Все</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="custom"><IonLabel>Выбрать</IonLabel></IonSegmentButton>
                  </IonSegment>
                  {accountFilter === 'custom' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 8 }}>
                      {kindFilteredAccounts.map((a) => {
                        const active = selectedAccountIds.includes(a.id)
                        const toggleAccount = () => setSelectedAccountIds((previous) =>
                          previous.includes(a.id)
                            ? previous.filter((id) => id !== a.id)
                            : [...previous, a.id]
                        )
                        return (
                          <IonChip
                            key={a.id}
                            className="dashboard-account-chip"
                            color={active ? 'primary' : 'medium'}
                            outline={!active}
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            onClick={toggleAccount}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                toggleAccount()
                              }
                            }}
                          >
                            <AccountIcon value={a.icon} size={20} shape="rectangle" />
                            <IonLabel>{a.name}</IonLabel>
                          </IonChip>
                        )
                      })}
                    </div>
                  )}
                </div>
              </IonPopover>
            </div>

          </section>

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

          {chartMode !== 'balance' && (
            <section className="dashboard-period-controls" aria-label="Период доходов и расходов">
              <PeriodControl value={{ period, periodOffset, customFrom, customTo }} onChange={(next) => {
                if (next.period !== undefined) setPeriod(next.period)
                if (next.periodOffset !== undefined) setPeriodOffset(next.periodOffset)
                if (next.customFrom !== undefined) setCustomFrom(next.customFrom)
                if (next.customTo !== undefined) setCustomTo(next.customTo)
              }} />
            </section>
          )}

          {/* Pie chart block */}
          <IonCard className="dashboard-chart-card" style={{ margin: '0 0 16px 0' }}>
            <IonCardHeader className="dashboard-chart-header">
              <div className="dashboard-chart-heading">
                <IonCardTitle style={{ fontSize: '0.875rem' }}>{chartTitles[chartMode]}</IonCardTitle>
                <IonButton
                  id="dashboard-chart-settings"
                  className="dashboard-chart-settings"
                  fill="clear"
                  color="medium"
                  aria-label={chartSettingsLabels[chartMode]}
                  aria-haspopup="dialog"
                  >
                  <IonIcon slot="icon-only" icon={optionsOutline} />
                </IonButton>
              </div>
            </IonCardHeader>
            <IonCardContent>
              <ChartBlock
                data={activePieData}
                sym={sym}
                emptyText={chartEmptyTexts[chartMode]}
                tooltipStyle={chartTheme.tooltipStyle}
                legendColor={chartTheme.legendColor}
              />
            </IonCardContent>
          </IonCard>

          <IonPopover
            key={chartMode}
            trigger="dashboard-chart-settings"
            className="dashboard-chart-popover"
            side="bottom"
            alignment="end"
            aria-label={chartSettingsLabels[chartMode]}
          >
            <div className="dashboard-chart-popover-content">
              <IonCheckbox
                className="dashboard-transfer-checkbox"
                labelPlacement="end"
                justify="start"
                checked={includeShared}
                onIonChange={(event) => setIncludeShared(event.detail.checked)}
              >
                Учитывать общие счета
              </IonCheckbox>
              {chartMode !== 'balance' && (
                <IonCheckbox
                  className="dashboard-transfer-checkbox"
                  labelPlacement="end"
                  justify="start"
                  checked={transferVisibility[chartMode]}
                  onIonChange={(event) => setTransferVisibility((previous) => ({
                    ...previous, [chartMode]: event.detail.checked,
                  }))}
                >
                  Отображать переводы
                </IonCheckbox>
              )}
            </div>
          </IonPopover>

          {/* Tags breakdown */}
          {chartMode !== 'balance' && byTag.length > 0 && (
            <IonCard style={{ margin: '0 0 16px 0' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '0.875rem' }}>{chartMode === 'income' ? 'Доходы по тегам' : 'Расходы по тегам'}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {byTag.slice(0, 6).map((s) => (
                    <IonItem
                      key={s.tagId}
                      routerLink={filteredTransactionsHref(
                        { accountIds: filteredAccounts.map((account) => account.id), tagIds: [s.tagId] },
                        { period, periodOffset, customFrom, customTo },
                      )}
                      routerDirection="forward"
                      disabled={accountsLoading || filteredAccounts.length === 0}
                      detail
                      lines="none"
                      className="dashboard-tag-row"
                    >
                      <IonLabel color="medium" style={{ fontSize: '0.75rem' }}>#{s.tagName}</IonLabel>
                      <IonNote slot="end" style={{ fontSize: '0.75rem', fontWeight: 500 }}>{formatAmount(s.amount, sym)}</IonNote>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>
          )}

          {chartMode === 'balance' && (
            <RecentTransactions
              accounts={accounts}
              accountIds={filteredAccounts.map((account) => account.id)}
              accountsLoading={accountsLoading}
              accountsError={accountsError}
              currentUserId={user?.id}
              defaultCurrency={displayCurrency}
            />
          )}
        </div>

        {/* FAB */}

      </AppContent>
    </IonPage>
  )
}
