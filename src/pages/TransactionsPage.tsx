import { PeriodControl } from '@/components/PeriodControl'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppContent } from '@/components/layout/AppContent'
import { useCallback, useMemo, useState } from 'react'
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionPaginationOptions } from '@/lib/transactionPagination'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChartTooltip } from '@/components/PieChartTooltip'
import { usePieChartTooltip } from '@/lib/usePieChartTooltip'
import {
  IonAccordion,
  IonAccordionGroup,
  IonAlert,
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonText,
  IonToast,
  } from '@ionic/react'
import {
  addOutline,
  alertCircleOutline,
  receiptOutline,
  trendingDownOutline,
  trendingUpOutline,
} from 'ionicons/icons'

import { accountsApi } from '@/api/accounts'
import { analyticsApi } from '@/api/analytics'
import { categoriesApi } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { transactionsApi, type TransactionFilter } from '@/api/transactions'
import {
  categoryIconChartColor,
  CategoryIcon,
  UNCATEGORIZED_CATEGORY_ICON,
} from '@/components/CategoryIcon'
import { FilterSheet } from '@/components/FilterSheet'
import { TransactionItem } from '@/components/TransactionItem'
import {
  buildTransactionAnalyticsParams,
  formatCurrencyAmount,
  groupTransactionsByDate,
  hasTransactionFilters,
  transactionDefaultCurrencyAmount,
} from '@/lib/transactionList'
import { useChartTheme } from '@/lib/useChartTheme'
import { useAuthStore } from '@/store/authStore'
import {
  computeDateRange,
  usePeriodStore,
} from '@/store/periodStore'

import {
  filterFromParams,
  filterToParams,
  filteredTransactionsHref,
  periodFromParams,
  periodToParams,
  type TransactionPeriod,
} from '@/lib/transactionNavigation'

import './TransactionsPage.css'

export function TransactionsPage() {
  const tooltip = usePieChartTooltip()
  const queryClient = useQueryClient()
  const currentLocation = useLocation()
  const route = useRouteMatch()
  // Ionic keeps previous pages mounted during forward navigation and swipe-back.
  const [pageLocation, setPageLocation] = useState(currentLocation)
  const isCurrentPage = currentLocation.pathname === route.url
  if (isCurrentPage && pageLocation !== currentLocation) setPageLocation(currentLocation)
  const location = isCurrentPage ? currentLocation : pageLocation
  const history = useHistory()
  const searchParams = new URLSearchParams(location.search)
  const filter = filterFromParams(searchParams)
  const setFilter = useCallback((nextFilter: TransactionFilter) => {
    history.replace({ ...location, search: filterToParams(nextFilter, new URLSearchParams(location.search)).toString() })
  }, [history, location])
  const currentUserId = useAuthStore((state) => state.user?.id)
  const defaultCurrency = useAuthStore((state) => state.user?.defaultCurrency ?? 'USD')
  const storedPeriod = usePeriodStore()
  const isFilteredView = location.pathname.startsWith('/transactions/filtered/')
  const navigationPeriod = isFilteredView ? periodFromParams(searchParams, storedPeriod) : storedPeriod
  const { period, periodOffset, customFrom, customTo } = navigationPeriod
  function updatePeriod(next: Partial<TransactionPeriod>) {
    if (isFilteredView) {
      history.replace({ ...location, search: periodToParams({ ...navigationPeriod, ...next }, searchParams).toString() })
      return
    }
    if (next.period !== undefined) storedPeriod.setPeriod(next.period)
    if (next.periodOffset !== undefined) storedPeriod.setPeriodOffset(next.periodOffset)
    if (next.customFrom !== undefined) storedPeriod.setCustomFrom(next.customFrom)
    if (next.customTo !== undefined) storedPeriod.setCustomTo(next.customTo)
  }
  const [showFilters, setShowFilters] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [chartMode, setChartMode] = useState<'expenses' | 'income'>('expenses')
  const [deleteAlertTxId, setDeleteAlertTxId] = useState<string | null>(null)
  const chartTheme = useChartTheme()

  const { dateFrom, dateTo } = computeDateRange(
    period,
    periodOffset,
    customFrom,
    customTo,
  )
  const effectiveFilter: TransactionFilter = { ...filter, dateFrom, dateTo }
  const analyticsParams = buildTransactionAnalyticsParams(
    filter,
    dateFrom,
    dateTo,
    defaultCurrency,
  )

  const expenseAnalyticsQuery = useQuery({
    queryKey: ['analytics', 'by-category', 'expense', analyticsParams],
    queryFn: () => analyticsApi.byCategory({ ...analyticsParams, type: 'expense' }),
    enabled: showChart,
  })
  const incomeAnalyticsQuery = useQuery({
    queryKey: ['analytics', 'by-category', 'income', analyticsParams],
    queryFn: () => analyticsApi.byCategory({ ...analyticsParams, type: 'income' }),
    enabled: showChart,
  })
  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary', 'transactions', analyticsParams],
    queryFn: () => analyticsApi.summary(analyticsParams),
  })
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })
  const expenseCategoriesQuery = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesApi.list('expense'),
  })
  const incomeCategoriesQuery = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: () => categoriesApi.list('income'),
  })
  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  })
  const transactionsQuery = useInfiniteQuery(transactionPaginationOptions(effectiveFilter))

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])
  const allCategories = useMemo(() => [
    ...(expenseCategoriesQuery.data ?? []),
    ...(incomeCategoriesQuery.data ?? []),
  ], [expenseCategoriesQuery.data, incomeCategoriesQuery.data])
  const tags = tagsQuery.data ?? []
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  )
  const categoriesById = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category])),
    [allCategories],
  )
  const groupedTransactions = useMemo(() => groupTransactionsByDate(
    transactionsQuery.data?.pages.flat() ?? [],
    (tx) => transactionDefaultCurrencyAmount(
      tx,
      accountsById.get(tx.accountId),
      currentUserId,
      defaultCurrency,
    ),
  ), [accountsById, currentUserId, defaultCurrency, transactionsQuery.data])

  const chartQuery = chartMode === 'expenses' ? expenseAnalyticsQuery : incomeAnalyticsQuery
  const chartCategoryType = chartMode === 'expenses' ? 'expense' : 'income'
  const chartData = (chartQuery.data ?? [])
    .filter((stat) => stat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((stat) => {
      const icon = stat.categoryId === 'uncategorized'
        ? UNCATEGORIZED_CATEGORY_ICON
        : stat.icon
      return {
        ...stat,
        icon,
        color: categoryIconChartColor(icon, chartCategoryType),
      }
    })
  const hasFilters = hasTransactionFilters(filter)
  const filterGroups = [
    { kind: 'accountIds', label: 'Счета',
      items: (filter.accountIds ?? []).map((id) => ({ id, name: accountsById.get(id)?.name ?? 'Счёт' })) },
    { kind: 'categoryIds', label: 'Категории',
      items: (filter.categoryIds ?? []).map((id) => ({ id, name: categoriesById.get(id)?.name ?? 'Категория' })) },
    { kind: 'tagIds', label: 'Теги',
      items: (filter.tagIds ?? []).map((id) => ({ id, name: tags.find((tag) => tag.id === id)?.name ?? 'Тег' })) },
  ] as const

  function addTransaction() {
    const selectedDate = periodOffset !== 0 || period !== 'day' ? `?date=${dateTo}` : ''
    history.push(`/transactions/add${selectedDate}`)
  }

  return (
    <IonPage>
      <PageHeader title="Транзакции" backHref={isFilteredView ? '/transactions' : '/dashboard'} />

      <AppContent fullscreen withFab
        fixed={
          <IonFab slot="fixed" vertical="bottom" horizontal="end" className="transactions-fab">
            <IonFabButton onClick={addTransaction} aria-label="Добавить транзакцию">
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        }
      >
        <div>
          <PeriodControl value={navigationPeriod} onChange={updatePeriod}
            trailingControl={<FilterSheet value={filter} onChange={setFilter} isOpen={showFilters} onOpenChange={setShowFilters} />} />

          <div className="transactions-filter-status" aria-live="polite">
            {hasFilters ? (
              <div className="transactions-active-filters" aria-label="Активные фильтры">
                {filterGroups.filter((group) => group.items.length > 0).map((group) => {
                  const name = `${group.kind === 'tagIds' ? '#' : ''}${group.items[0].name}`
                  const remaining = group.items.length - 1
                  return (
                    <IonButton
                      key={group.kind}
                      className="transactions-filter-group"
                      fill="clear"
                      size="small"
                      onClick={() => setShowFilters(true)}
                      aria-label={`${group.label}: ${name}${remaining > 0 ? `, ещё ${remaining}` : ''}. Открыть фильтры`}
                      title={`${group.label}: ${name}`}
                    >
                      <span className="transactions-filter-group__name">{name}</span>
                      {remaining > 0 && <span className="transactions-filter-group__count">+{remaining}</span>}
                    </IonButton>
                  )
                })}
              </div>
            ) : (
              <><span className="transactions-filter-status__label">Фильтры:</span><span>все счета, категории и теги</span></>
            )}
          </div>

          <section className="transactions-summary" aria-label="Сводка за период">
            <div className="transactions-summary__item">
              <span>Расходы</span>
              {summaryQuery.isLoading ? (
                <IonSkeletonText animated className="transactions-summary__skeleton" />
              ) : summaryQuery.isError ? (
                <strong className="transactions-summary__amount">—</strong>
              ) : (
                <strong className="transactions-summary__amount transactions-summary__amount--expense">
                  {formatCurrencyAmount(-(summaryQuery.data?.expenses ?? 0), defaultCurrency, 2)}
                </strong>
              )}
            </div>
            <div className="transactions-summary__item">
              <span>Доходы</span>
              {summaryQuery.isLoading ? (
                <IonSkeletonText animated className="transactions-summary__skeleton" />
              ) : summaryQuery.isError ? (
                <strong className="transactions-summary__amount">—</strong>
              ) : (
                <strong className="transactions-summary__amount transactions-summary__amount--income">
                  {formatCurrencyAmount(summaryQuery.data?.income ?? 0, defaultCurrency, 2)}
                </strong>
              )}
            </div>
          </section>

          {summaryQuery.isError && (
            <div className="transactions-inline-error" role="alert">
              Сводка недоступна.
              <IonButton fill="clear" size="small" onClick={() => summaryQuery.refetch()}>
                Повторить
              </IonButton>
            </div>
          )}

          <IonAccordionGroup
            value={showChart ? 'period-analytics' : undefined}
            className="transactions-analytics"
            onIonChange={(event) => {
              if (event.target !== event.currentTarget) return
              setShowChart(event.detail.value === 'period-analytics')
            }}
          >
            <IonAccordion value="period-analytics" toggleIconSlot="end">
              <IonItem slot="header" lines="none" className="transactions-analytics__header">
                <IonLabel>Аналитика за период</IonLabel>
              </IonItem>
              <div slot="content" className="transactions-analytics__content">
                <IonSegment
                  value={chartMode}
                  onIonChange={(event) => setChartMode(event.detail.value as 'expenses' | 'income')}
                  aria-label="Тип аналитики"
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

                {chartQuery.isLoading ? (
                  <IonSkeletonText animated className="transactions-chart-skeleton" />
                ) : chartQuery.isError ? (
                  <div className="app-state transactions-state transactions-state--compact" role="alert">
                    <IonIcon icon={alertCircleOutline} aria-hidden="true" />
                    <p>Не удалось загрузить аналитику.</p>
                    <IonButton fill="outline" onClick={() => chartQuery.refetch()}>
                      Повторить
                    </IonButton>
                  </div>
                ) : chartData.length === 0 ? (
                  <IonText className="transactions-chart-empty">
                    {chartMode === 'expenses' ? 'Нет расходов за период' : 'Нет доходов за период'}
                  </IonText>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="amount"
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={35}
                          onClick={tooltip.onSectorClick}
                        >
                          {chartData.map((stat) => (
                            <Cell
                              key={stat.categoryId}
                              fill={stat.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          trigger={tooltip.trigger}
                          active={tooltip.active}
                          contentStyle={chartTheme.tooltipStyle}
                          content={<PieChartTooltip categoryType={chartCategoryType} formatAmount={(amount) => formatCurrencyAmount(amount, defaultCurrency, 2)} />}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="transactions-chart-legend">
                      {chartData.map((stat) => (
                        <div key={stat.categoryId} className="transactions-chart-legend__item">
                          <div className="transactions-chart-legend__label">
                            <span
                              className="transactions-chart-legend__dot"
                              style={{ background: stat.color }}
                              aria-hidden="true"
                            />
                            <CategoryIcon
                              value={stat.icon}
                              type={chartCategoryType}
                              size={20}
                              ariaLabel={stat.categoryId === 'uncategorized' ? 'Без категории' : undefined}
                            />
                            <span style={{ color: chartTheme.legendColor }}>{stat.categoryName}</span>
                          </div>
                          <span className="transactions-chart-legend__amount">
                            {formatCurrencyAmount(stat.amount, defaultCurrency, 2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </IonAccordion>
          </IonAccordionGroup>

          {transactionsQuery.isLoading ? (
            <IonList className="transactions-list" aria-label="Загрузка транзакций">
              {['first', 'second', 'third'].map((key) => (
                <IonItem key={key} lines="full" className="transactions-skeleton-row">
                  <IonSkeletonText slot="start" animated className="transactions-skeleton-row__icon" />
                  <IonLabel>
                    <IonSkeletonText animated className="transactions-skeleton-row__title" />
                    <IonSkeletonText animated className="transactions-skeleton-row__subtitle" />
                  </IonLabel>
                  <IonSkeletonText slot="end" animated className="transactions-skeleton-row__amount" />
                </IonItem>
              ))}
            </IonList>
          ) : transactionsQuery.isError && !transactionsQuery.data ? (
            <div className="app-state transactions-state" role="alert">
              <IonIcon icon={alertCircleOutline} aria-hidden="true" />
              <h2>Не удалось загрузить транзакции</h2>
              <p>Проверьте подключение и попробуйте ещё раз.</p>
              <IonButton fill="outline" onClick={() => transactionsQuery.refetch()}>
                Повторить
              </IonButton>
            </div>
          ) : groupedTransactions.length === 0 ? (
            <div className="app-state transactions-state">
              <IonIcon icon={receiptOutline} aria-hidden="true" />
              <h2>{hasFilters ? 'Ничего не найдено' : 'За этот период транзакций нет'}</h2>
              <p>
                {hasFilters
                  ? 'Измените условия или сбросьте активные фильтры.'
                  : 'Добавьте первую операцию за выбранный период.'}
              </p>
              <IonButton fill="outline" onClick={hasFilters ? () => setFilter({}) : addTransaction}>
                {hasFilters ? 'Сбросить фильтры' : 'Добавить транзакцию'}
              </IonButton>
            </div>
          ) : (
            <IonList className="transactions-list">
              {groupedTransactions.map(({ dateKey, label, items, total }) => (
                <IonItemGroup key={dateKey}>
                  <IonItemDivider sticky className="transactions-date-divider">
                    <IonLabel role="heading" aria-level={2}>
                      <span className="transactions-date-divider__date">{label}</span>
                    </IonLabel>
                    {total != null && (
                      <IonNote
                        slot="end"
                        className={`transactions-date-divider__total ${total < 0 ? 'is-expense' : total > 0 ? 'is-income' : ''}`}
                      >
                        {formatCurrencyAmount(total, defaultCurrency, 2)}
                      </IonNote>
                    )}
                  </IonItemDivider>
                  {items.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      tagHref={(tagId) => filteredTransactionsHref(
                        { ...filter, tagIds: [tagId], tagMode: 'or' }, navigationPeriod, location.pathname,
                      )}
                      tx={tx}
                      account={accountsById.get(tx.accountId)}
                      toAccount={tx.toAccountId ? accountsById.get(tx.toAccountId) : undefined}
                      category={tx.categoryId ? categoriesById.get(tx.categoryId) : undefined}
                      currentUserId={currentUserId}
                      defaultCurrency={defaultCurrency}
                      onEdit={(id) => history.push(`/transactions/${id}/edit`)}
                      onDelete={(id) => setDeleteAlertTxId(id)}
                    />
                  ))}
                </IonItemGroup>
              ))}
            </IonList>
          )}
          {transactionsQuery.isFetchNextPageError && (
            <div className="transactions-inline-error" role="alert">
              Не удалось загрузить следующие транзакции.
              <IonButton fill="clear" disabled={transactionsQuery.isFetching} onClick={() => transactionsQuery.fetchNextPage({ cancelRefetch: false })}>
                Повторить
              </IonButton>
            </div>
          )}
          <IonInfiniteScroll
            threshold="200px"
            disabled={!isCurrentPage || !transactionsQuery.hasNextPage || transactionsQuery.isFetchNextPageError}
            onIonInfinite={async (event) => {
              const scroll = event.target
              try {
                if (transactionsQuery.hasNextPage && !transactionsQuery.isFetching) {
                  await transactionsQuery.fetchNextPage({ cancelRefetch: false })
                }
              } finally {
                await scroll.complete()
              }
            }}
          >
            <IonInfiniteScrollContent loadingSpinner="dots" loadingText="Загрузка транзакций…" />
          </IonInfiniteScroll>
        </div>


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

        <IonToast
          isOpen={deleteMutation.isSuccess || deleteMutation.isError}
          color={deleteMutation.isError ? 'danger' : 'success'}
          message={deleteMutation.isError ? 'Не удалось удалить транзакцию' : 'Транзакция удалена'}
          duration={4000}
          onDidDismiss={() => deleteMutation.reset()}
        />
      </AppContent>
    </IonPage>
  )
}
