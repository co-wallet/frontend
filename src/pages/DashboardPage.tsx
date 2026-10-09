import { RecentTransactions } from '@/components/RecentTransactions'
import { PeriodControl } from '@/components/PeriodControl'
import { PieChartTooltip } from '@/components/PieChartTooltip'
import { usePieChartTooltip } from '@/lib/usePieChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppContent } from '@/components/layout/AppContent'
import { useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  IonPage,
  IonCheckbox,
  IonPopover,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonText,
  IonRouterLink,
} from '@ionic/react'
import {
  trendingDownOutline,
  trendingUpOutline,
  analyticsOutline,
  optionsOutline,
  swapHorizontalOutline,
  chevronDownOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/store/authStore'
import { usePeriodStore, computeDateRange } from '@/store/periodStore'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'
import { accountsApi, type AccountKind } from '@/api/accounts'
import type { TransactionFilter, TransactionType } from '@/api/transactions'
import { currenciesApi, type Currency } from '@/api/currencies'
import { authApi } from '@/api/auth'
import { AccountIcon, accountIconStyle } from '@/components/AccountIcon'
import { CategoryIcon, UNCATEGORIZED_CATEGORY_ICON } from '@/components/CategoryIcon'
import { QuickTransactionFab } from '@/components/QuickTransactionFab'
import { ACCOUNT_KIND_OPTIONS, accountKindShortLabel } from '@/lib/accountKind'
import { filterAccountsByKinds } from '@/lib/accountFilters'
import {
  dashboardEntryColor,
  DASHBOARD_TOOLTIP_WIDTH,
  dashboardTooltipPosition,
  prepareDashboardChart,
  type DashboardPieEntry,
} from '@/lib/dashboardChart'
import { NON_ANIMATED_PIE_PROPS } from '@/lib/chartMotion'
import {
  accountTransactionsHref,
  categoryTransactionsHref,
  filteredTransactionsHref,
  transactionCreationLocation,
} from '@/lib/transactionNavigation'

import './DashboardPage.css'

type ChartMode = 'balance' | 'expenses' | 'income'

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
  onNavigate,
}: {
  data: DashboardPieEntry[]
  sym: string
  emptyText: string
  tooltipStyle: React.CSSProperties
  legendColor: string
  onNavigate: (href: string) => void
}) {
  const [visibleCount, setVisibleCount] = useState(LEGEND_PAGE_SIZE)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>()
  const positionedSector = useRef<string | null>(null)
  const tooltip = usePieChartTooltip()
  const { chartEntries, legendEntries } = prepareDashboardChart(data)
  const visibleEntries = legendEntries.slice(0, visibleCount)

  const positionTooltip = (event: React.MouseEvent<Element>, sectorKey: string) => {
    if (positionedSector.current === sectorKey) return
    const svg = event.currentTarget.closest('svg')
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    setTooltipPosition(dashboardTooltipPosition({
      chartWidth: bounds.width,
      chartHeight: bounds.height,
      pointerX: event.clientX - bounds.left,
      pointerY: event.clientY - bounds.top,
      chartLeft: bounds.left,
      chartTop: bounds.top,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }))
    positionedSector.current = sectorKey
  }

  const resetTooltipPosition = () => {
    positionedSector.current = null
    setTooltipPosition(undefined)
  }

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
              {...NON_ANIMATED_PIE_PROPS}
              data={chartEntries}
              dataKey="chartAmount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              onMouseMove={(entry, index, event) => positionTooltip(
                event, `${entry.transactionsHref ?? entry.name}:${index}`,
              )}
              onMouseLeave={resetTooltipPosition}
              onClick={(entry, index, event) => {
                positionTooltip(event, `${entry.transactionsHref ?? entry.name}:${index}`)
                if (entry.transactionsHref) {
                  tooltip.onNavigableSectorClick(entry.transactionsHref, () => onNavigate(entry.transactionsHref!))
                  return
                }
                tooltip.onSectorClick()
              }}
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
              position={tooltipPosition}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ width: DASHBOARD_TOOLTIP_WIDTH }}
              contentStyle={tooltipStyle}
              content={<PieChartTooltip
                maxWidth={DASHBOARD_TOOLTIP_WIDTH}
                formatAmount={(amount) => formatAmount(amount, sym)}
              />}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div style={{ marginTop: 8 }}>
        {visibleEntries.map((s, i) => {
          const isNegative = s.amount < 0
          const content = (
            <>
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
            </>
          )
          return s.legendTransactionsHref ? (
            <IonRouterLink
              key={i}
              className="dashboard-chart-legend-link"
              routerLink={s.legendTransactionsHref}
              routerDirection="forward"
              aria-label={`Транзакции по счету ${s.name}`}
            >
              <div className="dashboard-chart-legend-row dashboard-chart-legend-row--link">
                {content}
              </div>
            </IonRouterLink>
          ) : (
            <div key={i} className="dashboard-chart-legend-row">
              {content}
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
  const history = useHistory()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)

  const { period, periodOffset, customFrom, customTo, setPeriod, setPeriodOffset, setCustomFrom, setCustomTo } = usePeriodStore()
  const [displayCurrency, setDisplayCurrency] = useState(user?.defaultCurrency ?? 'USD')
  const [chartMode, setChartMode] = useState<ChartMode>('balance')
  const [transferVisibility, setTransferVisibility] = useState({ expenses: false, income: true })
  const [includeShared, setIncludeShared] = useState(false)
  const [selectedKinds, setSelectedKinds] = useState<AccountKind[]>(['spending'])

  const saveCurrency = useMutation({
    mutationFn: (code: string) => authApi.updateMe(code),
    onSuccess: (updatedUser) => updateUser(updatedUser),
  })
  const { data: accounts = [], isLoading: accountsLoading, isError: accountsError } = useQuery({
    queryKey: ['accounts', displayCurrency],
    queryFn: () => accountsApi.list(displayCurrency),
  })

  const filteredAccounts = filterAccountsByKinds(accounts, selectedKinds)
    .filter((account) => includeShared || account.accessMode !== 'shared')
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
  const transactionFilter: TransactionFilter = {
    accountKinds: selectedKinds,
    ...(includeShared ? { includeShared: true } : {}),
    ...(transferVisibility.expenses ? { includeTransferExpenses: true } : {}),
    ...(!transferVisibility.income ? { includeTransferIncome: false } : {}),
  }
  const transactionPeriod = { period, periodOffset, customFrom, customTo }
  const recentTransactionFilter: TransactionFilter = chartMode === 'balance'
    ? {}
    : { dateFrom, dateTo }
  const allTransactionsHref = filteredTransactionsHref(transactionFilter, transactionPeriod)

  function addTransaction(type: TransactionType) {
    history.push(transactionCreationLocation(location, {
      type,
      ...(chartMode === 'balance' ? {} : { date: dateTo }),
    }))
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

  const summary = !hasAnalyticsAccounts ? { balance: 0, expenses: 0, income: 0 } : summaryRaw
  const byExpense = !hasAnalyticsAccounts ? [] : byExpenseRaw
  const byIncome = !hasAnalyticsAccounts ? [] : byIncomeRaw

  const balancePieData: DashboardPieEntry[] = filteredAccounts
    .filter((a) => a.balance != null)
    .map((a) => {
      const transactionsHref = accountTransactionsHref(a, transactionPeriod, location.pathname)
      return {
        name: a.name,
        transactionsHref,
        legendTransactionsHref: transactionsHref,
        icon: a.icon ?? undefined,
        iconType: 'account' as const,
        amount: a.balance!.display,
      }
    })

  const expensePieData: DashboardPieEntry[] = byExpense
    .filter((s) => s.amount > 0)
    .map((s) => ({
      name: s.categoryName,
      transactionsHref: categoryTransactionsHref(
        s.categoryId, transactionFilter, transactionPeriod, location.pathname,
      ),
      icon: s.categoryId === 'uncategorized' ? UNCATEGORIZED_CATEGORY_ICON : s.icon ?? undefined,
      iconType: s.categoryId.startsWith('transfers:') || s.categoryId === 'transfers' ? 'transfer' as const : 'category' as const,
      categoryType: 'expense',
      amount: s.amount,
    }))

  const incomePieData: DashboardPieEntry[] = byIncome
    .filter((s) => s.amount > 0)
    .map((s) => ({
      name: s.categoryName,
      transactionsHref: categoryTransactionsHref(
        s.categoryId, transactionFilter, transactionPeriod, location.pathname,
      ),
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
          <QuickTransactionFab onSelect={addTransaction} />
        }
      >
        <div>
          <section className="dashboard-view-controls" aria-label="Параметры отображения">
            {/* Account filter */}
            <div className="dashboard-account-filter">
              <IonButton
                id="dashboard-kind-filter"
                className="dashboard-kind-trigger"
                fill="outline"
                color="medium"
                aria-label="Тип средств"
                aria-haspopup="dialog"
              >
                <span className="dashboard-kind-trigger__content"><span>{selectedKinds.length === 0 ? 'Типы не выбраны' : selectedKinds.length === 1
                  ? accountKindShortLabel(selectedKinds[0])
                  : selectedKinds.length === ACCOUNT_KIND_OPTIONS.length
                    ? 'Все типы средств'
                    : `Типов средств: ${selectedKinds.length}`}</span>
                <IonIcon icon={chevronDownOutline} aria-hidden="true" /></span>
              </IonButton>
              <IonPopover
                trigger="dashboard-kind-filter"
                className="dashboard-kind-popover"
                reference="trigger"
                size="cover"
                side="bottom"
                alignment="start"
                arrow={false}
                aria-label="Тип средств"
              >
                <div className="dashboard-kind-options">
                  {ACCOUNT_KIND_OPTIONS.map((option) => {
                    const selected = selectedKinds.includes(option.value)
                    return (
                      <IonButton
                        key={option.value}
                        className="dashboard-kind-option"
                        fill={selected ? 'solid' : 'clear'}
                        color={selected ? 'primary' : 'medium'}
                        aria-pressed={selected}
                        onClick={() => setSelectedKinds((previous) => previous.includes(option.value)
                          ? previous.filter((kind) => kind !== option.value)
                          : [...previous, option.value])}
                      >
                        <span>{option.shortLabel}</span>
                      </IonButton>
                    )
                  })}
                </div>
              </IonPopover>
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
            </div>

          </section>

          {((summary?.expensesMissingAmounts ?? 0) + (summary?.incomeMissingAmounts ?? 0) > 0) &&
            <IonText color="warning"><p role="status">Итоги неполные: для {((summary?.expensesMissingAmounts ?? 0) + (summary?.incomeMissingAmounts ?? 0))} операций не заполнена сумма в {displayCurrency}. Укажите её в транзакциях.</p></IonText>}
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
                onNavigate={(href) => history.push(href)}
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

          <RecentTransactions
            accounts={accounts}
            accountIds={filteredAccounts.map((account) => account.id)}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            currentUserId={user?.id}
            defaultCurrency={displayCurrency}
            filter={recentTransactionFilter}
            fullListHref={allTransactionsHref}
          />
        </div>

        {/* FAB */}

      </AppContent>
    </IonPage>
  )
}
