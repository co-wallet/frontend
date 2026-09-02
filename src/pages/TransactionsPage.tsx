import { useCallback, useMemo, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  IonAccordion,
  IonAccordionGroup,
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react'
import {
  addOutline,
  alertCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  receiptOutline,
  trendingDownOutline,
  trendingUpOutline,
} from 'ionicons/icons'

import { accountsApi } from '@/api/accounts'
import { analyticsApi } from '@/api/analytics'
import { categoriesApi } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { transactionsApi, type TransactionFilter } from '@/api/transactions'
import { CategoryIcon } from '@/components/CategoryIcon'
import { FilterSheet } from '@/components/FilterSheet'
import { TransactionItem } from '@/components/TransactionItem'
import { EXPENSE_COLORS, INCOME_COLORS } from '@/lib/chartColors'
import { flattenCategories } from '@/lib/categories'
import {
  buildTransactionAnalyticsParams,
  formatCurrencyAmount,
  formatPeriodControlLabel,
  groupTransactionsByDate,
  hasTransactionFilters,
  transactionDefaultCurrencyAmount,
} from '@/lib/transactionList'
import { useChartTheme } from '@/lib/useChartTheme'
import { useAuthStore } from '@/store/authStore'
import {
  computeDateRange,
  PERIOD_LABELS,
  type Period,
  usePeriodStore,
} from '@/store/periodStore'

import './TransactionsPage.css'

const PERIOD_SELECT_LABELS: Record<Period, string> = {
  ...PERIOD_LABELS,
  custom: 'Другой',
}

function filterFromParams(searchParams: URLSearchParams): TransactionFilter {
  const filter: TransactionFilter = {}
  if (searchParams.get('account_ids')) filter.accountIds = searchParams.get('account_ids')!.split(',')
  if (searchParams.get('category_ids')) filter.categoryIds = searchParams.get('category_ids')!.split(',')
  if (searchParams.get('tag_ids')) filter.tagIds = searchParams.get('tag_ids')!.split(',')
  if (searchParams.get('tag_mode') === 'and') filter.tagMode = 'and'
  return filter
}

function filterToParams(filter: TransactionFilter): URLSearchParams {
  const searchParams = new URLSearchParams()
  if (filter.accountIds?.length) searchParams.set('account_ids', filter.accountIds.join(','))
  if (filter.categoryIds?.length) searchParams.set('category_ids', filter.categoryIds.join(','))
  if (filter.tagIds?.length) searchParams.set('tag_ids', filter.tagIds.join(','))
  if (filter.tagMode === 'and') searchParams.set('tag_mode', 'and')
  return searchParams
}

function valueFromDatetime(value: string | string[] | null | undefined): string {
  return typeof value === 'string' ? value.slice(0, 10) : ''
}

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const history = useHistory()
  const searchParams = new URLSearchParams(location.search)
  const filter = filterFromParams(searchParams)
  const setFilter = useCallback((nextFilter: TransactionFilter) => {
    history.replace({ search: filterToParams(nextFilter).toString() })
  }, [history])
  const currentUserId = useAuthStore((state) => state.user?.id)
  const defaultCurrency = useAuthStore((state) => state.user?.defaultCurrency ?? 'USD')
  const {
    period,
    periodOffset,
    customFrom,
    customTo,
    setPeriod,
    setPeriodOffset,
    setCustomFrom,
    setCustomTo,
  } = usePeriodStore()
  const [showChart, setShowChart] = useState(false)
  const [chartMode, setChartMode] = useState<'expenses' | 'income'>('expenses')
  const [deleteAlertTxId, setDeleteAlertTxId] = useState<string | null>(null)
  const chartTheme = useChartTheme()

  const isCustomPeriod = period === 'custom'
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
  const transactionsQuery = useQuery({
    queryKey: ['transactions', effectiveFilter],
    queryFn: () => transactionsApi.list(effectiveFilter),
  })

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
    ...flattenCategories(expenseCategoriesQuery.data ?? []),
    ...flattenCategories(incomeCategoriesQuery.data ?? []),
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
    transactionsQuery.data ?? [],
    (tx) => transactionDefaultCurrencyAmount(
      tx,
      accountsById.get(tx.accountId),
      currentUserId,
      defaultCurrency,
    ),
  ), [accountsById, currentUserId, defaultCurrency, transactionsQuery.data])

  const chartQuery = chartMode === 'expenses' ? expenseAnalyticsQuery : incomeAnalyticsQuery
  const chartData = (chartQuery.data ?? [])
    .filter((stat) => stat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
  const chartColors = chartMode === 'expenses' ? EXPENSE_COLORS : INCOME_COLORS
  const hasFilters = hasTransactionFilters(filter)

  function removeFilter(kind: 'accountIds' | 'categoryIds' | 'tagIds', id: string) {
    const nextValues = filter[kind]?.filter((value) => value !== id)
    const nextFilter = { ...filter, [kind]: nextValues }
    if (kind === 'tagIds' && nextValues?.length === 0) delete nextFilter.tagMode
    setFilter(nextFilter)
  }

  function addTransaction() {
    const selectedDate = periodOffset !== 0 || period !== 'day' ? `?date=${dateTo}` : ''
    history.push(`/transactions/add${selectedDate}`)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Транзакции</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding transactions-content">
        <div className="transactions-shell">
          <div className="transactions-controls" aria-label="Период и фильтры">
            <IonButton
              fill="clear"
              className="transactions-period-arrow"
              onClick={() => setPeriodOffset((offset) => offset - 1)}
              disabled={isCustomPeriod}
              aria-label="Предыдущий период"
            >
              <IonIcon slot="icon-only" icon={chevronBackOutline} />
            </IonButton>

            <div className="transactions-period-selector">
              <IonSelect
                aria-label={`Выбранный период: ${formatPeriodControlLabel(period, dateFrom, dateTo)}`}
                interface="popover"
                value={period}
                selectedText={formatPeriodControlLabel(period, dateFrom, dateTo)}
                onIonChange={(event) => setPeriod(event.detail.value as Period)}
              >
                {(Object.keys(PERIOD_SELECT_LABELS) as Period[]).map((option) => (
                  <IonSelectOption key={option} value={option}>
                    {PERIOD_SELECT_LABELS[option]}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <IonButton
              fill="clear"
              className="transactions-period-arrow"
              onClick={() => setPeriodOffset((offset) => offset + 1)}
              disabled={isCustomPeriod || periodOffset >= 0}
              aria-label="Следующий период"
            >
              <IonIcon slot="icon-only" icon={chevronForwardOutline} />
            </IonButton>

            <FilterSheet value={filter} onChange={setFilter} />
          </div>

          {isCustomPeriod && (
            <div className="transactions-custom-period" aria-label="Другой период">
              <div className="transactions-custom-period__field">
                <span>С</span>
                <IonDatetimeButton datetime="transactions-date-from" />
              </div>
              <div className="transactions-custom-period__field">
                <span>По</span>
                <IonDatetimeButton datetime="transactions-date-to" />
              </div>
              <IonModal keepContentsMounted>
                <IonDatetime
                  id="transactions-date-from"
                  presentation="date"
                  value={customFrom}
                  max={customTo}
                  showDefaultButtons
                  doneText="Готово"
                  cancelText="Отмена"
                  onIonChange={(event) => setCustomFrom(valueFromDatetime(event.detail.value))}
                />
              </IonModal>
              <IonModal keepContentsMounted>
                <IonDatetime
                  id="transactions-date-to"
                  presentation="date"
                  value={customTo}
                  min={customFrom}
                  showDefaultButtons
                  doneText="Готово"
                  cancelText="Отмена"
                  onIonChange={(event) => setCustomTo(valueFromDatetime(event.detail.value))}
                />
              </IonModal>
            </div>
          )}

          <div className="transactions-filter-status" aria-live="polite">
            <span className="transactions-filter-status__label">Фильтры:</span>
            {hasFilters ? (
              <div className="transactions-active-filters" aria-label="Активные фильтры">
              {filter.accountIds?.map((id) => (
                <IonButton
                  key={`account-${id}`}
                  fill="outline"
                  size="small"
                  onClick={() => removeFilter('accountIds', id)}
                  aria-label={`Убрать фильтр по счёту ${accountsById.get(id)?.name ?? ''}`}
                >
                  {accountsById.get(id)?.name ?? 'Счёт'}
                  <IonIcon slot="end" icon={closeOutline} />
                </IonButton>
              ))}
              {filter.categoryIds?.map((id) => (
                <IonButton
                  key={`category-${id}`}
                  fill="outline"
                  size="small"
                  onClick={() => removeFilter('categoryIds', id)}
                  aria-label={`Убрать фильтр по категории ${categoriesById.get(id)?.name ?? ''}`}
                >
                  {categoriesById.get(id)?.name ?? 'Категория'}
                  <IonIcon slot="end" icon={closeOutline} />
                </IonButton>
              ))}
              {filter.tagIds?.map((id) => (
                <IonButton
                  key={`tag-${id}`}
                  fill="outline"
                  size="small"
                  onClick={() => removeFilter('tagIds', id)}
                  aria-label={`Убрать фильтр по тегу ${tags.find((tag) => tag.id === id)?.name ?? ''}`}
                >
                  #{tags.find((tag) => tag.id === id)?.name ?? 'Тег'}
                  <IonIcon slot="end" icon={closeOutline} />
                </IonButton>
              ))}
              <IonButton fill="clear" size="small" onClick={() => setFilter({})}>
                Сбросить все
              </IonButton>
              </div>
            ) : (
              <span>все счета, категории и теги</span>
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
                  <div className="transactions-state transactions-state--compact" role="alert">
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
                        >
                          {chartData.map((stat, index) => (
                            <Cell
                              key={stat.categoryId}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrencyAmount(value, defaultCurrency, 2)}
                          contentStyle={chartTheme.tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="transactions-chart-legend">
                      {chartData.map((stat, index) => (
                        <div key={stat.categoryId} className="transactions-chart-legend__item">
                          <div className="transactions-chart-legend__label">
                            <span
                              className="transactions-chart-legend__dot"
                              style={{ background: chartColors[index % chartColors.length] }}
                              aria-hidden="true"
                            />
                            <CategoryIcon
                              value={stat.icon}
                              type={chartMode === 'expenses' ? 'expense' : 'income'}
                              size={20}
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
          ) : transactionsQuery.isError ? (
            <div className="transactions-state" role="alert">
              <IonIcon icon={alertCircleOutline} aria-hidden="true" />
              <h2>Не удалось загрузить транзакции</h2>
              <p>Проверьте подключение и попробуйте ещё раз.</p>
              <IonButton fill="outline" onClick={() => transactionsQuery.refetch()}>
                Повторить
              </IonButton>
            </div>
          ) : groupedTransactions.length === 0 ? (
            <div className="transactions-state">
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
        </div>

        <IonFab slot="fixed" vertical="bottom" horizontal="end" className="transactions-fab">
          <IonFabButton onClick={addTransaction} aria-label="Добавить транзакцию">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

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
      </IonContent>
    </IonPage>
  )
}
