import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2, Pencil, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { transactionsApi, type Transaction, type TransactionFilter } from '@/api/transactions'
import { accountsApi, type Account } from '@/api/accounts'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'
import { FilterSheet } from '@/components/FilterSheet'
import { useAuthStore } from '@/store/authStore'
import { usePeriodStore, type Period, PERIOD_LABELS, computeDateRange, periodLabel } from '@/store/periodStore'

import { EXPENSE_COLORS, INCOME_COLORS } from '@/lib/chartColors'

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

function TypeIcon({ type }: { type: string }) {
  if (type === 'income') return <ArrowUpRight size={16} className="text-green-600" />
  if (type === 'transfer') return <ArrowLeftRight size={16} className="text-blue-500" />
  return <ArrowDownLeft size={16} className="text-red-500" />
}

function TransactionCard({
  tx,
  accounts,
  currentUserId,
  onDelete,
}: {
  tx: Transaction
  accounts: Account[]
  currentUserId: string | undefined
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const account = accounts.find((a) => a.id === tx.accountId)
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null

  const amountColor =
    tx.type === 'income' ? 'text-green-600' : tx.type === 'transfer' ? 'text-blue-600' : 'text-red-500'
  const amountSign = tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '−'

  const [showTotal, setShowTotal] = useState(false)

  const isShared = account?.type === 'shared'
  const userShare = isShared && currentUserId
    ? tx.shares?.find((s) => s.userId === currentUserId)
    : null
  const isSharedTx = isShared && userShare != null

  const displayAmount = isSharedTx ? userShare!.amount : tx.amount

  // For cross-currency transactions, compute default currency amount
  // For shared: proportional to user's share
  const defaultCurrencyDisplay = tx.defaultCurrencyAmount != null && tx.defaultCurrency != null
    ? (isSharedTx && tx.amount > 0
        ? Math.round(userShare!.amount / tx.amount * tx.defaultCurrencyAmount * 100) / 100
        : tx.defaultCurrencyAmount)
    : null

  const formatAmt = (n: number) =>
    n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  return (
    <div className="bg-card rounded-lg border p-3 flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <TypeIcon type={tx.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {tx.description || TYPE_LABELS[tx.type]}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {account?.name ?? tx.accountId}
          {toAccount ? ` → ${toAccount.name}` : ''}
        </p>
        {tx.tags?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {tx.tags.map((t) => (
              <span key={t.id} className="text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5">
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="flex flex-col items-end">
          <button
            type="button"
            onClick={isSharedTx ? () => setShowTotal((v) => !v) : undefined}
            className={`text-sm font-semibold ${amountColor} inline-flex items-center gap-1 ${isSharedTx ? 'cursor-pointer' : ''}`}
          >
            {isSharedTx && <Users size={12} className="text-muted-foreground" />}
            {amountSign}{formatAmt(displayAmount)} {tx.currency}
          </button>
          {isSharedTx && showTotal && (
            <span className="text-xs text-muted-foreground/60">
              всего {amountSign}{formatAmt(tx.amount)} {tx.currency}
            </span>
          )}
          {defaultCurrencyDisplay != null && tx.defaultCurrency != null && (
            <span className="text-xs text-muted-foreground/60">
              ≈ {formatAmt(defaultCurrencyDisplay)} {tx.defaultCurrency}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`/transactions/${tx.id}/edit`)}
          className="p-1 rounded hover:bg-muted text-muted-foreground ml-1"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(tx.id)}
          className="p-1 rounded hover:bg-muted text-destructive"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
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

export function TransactionsPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = filterFromParams(searchParams)
  const setFilter = useCallback((f: TransactionFilter) => {
    setSearchParams(filterToParams(f), { replace: true })
  }, [setSearchParams])
  const currentUserId = useAuthStore((s) => s.user?.id)
  const defaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'USD')
  const { period, periodOffset, customFrom, customTo, setPeriod, setPeriodOffset, setCustomFrom, setCustomTo } = usePeriodStore()
  const [showChart, setShowChart] = useState(false)
  const [chartMode, setChartMode] = useState<'expenses' | 'income'>('expenses')

  const isCustom = period === 'custom'
  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)

  // Merge period dates into filter (period dates override manual filter dates)
  const effectiveFilter: TransactionFilter = {
    ...filter,
    dateFrom,
    dateTo,
  }

  // Analytics for pie chart
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
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
              ← Назад
            </Link>
            <h1 className="text-xl font-bold">Транзакции</h1>
          </div>
          <Link
            to={`/transactions/add${periodOffset !== 0 || period !== 'day' ? `?date=${dateFrom}` : ''}`}
            className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
          >
            <Plus size={16} /> Добавить
          </Link>
        </div>

        {/* Period switcher */}
        <div className="grid grid-cols-3 gap-1 bg-card rounded-lg border p-1 mb-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded py-1.5 text-sm font-medium transition-colors ${
                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
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

        {/* Period navigation */}
        <div className="flex items-center justify-between bg-card rounded-lg border px-3 py-2 mb-3">
          <button
            onClick={() => setPeriodOffset((o) => o - 1)}
            disabled={isCustom}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium">
            {periodLabel(period, periodOffset, customFrom, customTo)}
          </span>
          <button
            onClick={() => setPeriodOffset((o) => o + 1)}
            disabled={isCustom || periodOffset >= 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Collapsible pie chart */}
        <div className="bg-card rounded-lg border mb-3">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium"
          >
            <span>Аналитика за период</span>
            {showChart ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showChart && (
            <div className="px-4 pb-4 space-y-3">
              {/* Mode toggle */}
              <div className="flex gap-1 bg-muted rounded-md p-0.5">
                <button
                  onClick={() => setChartMode('expenses')}
                  className={`flex-1 flex items-center justify-center gap-1 rounded py-1 text-xs font-medium transition-colors ${
                    chartMode === 'expenses' ? 'bg-background shadow text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  <TrendingDown size={12} /> Расходы
                </button>
                <button
                  onClick={() => setChartMode('income')}
                  className={`flex-1 flex items-center justify-center gap-1 rounded py-1 text-xs font-medium transition-colors ${
                    chartMode === 'income' ? 'bg-background shadow text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <TrendingUp size={12} /> Доходы
                </button>
              </div>

              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {chartMode === 'expenses' ? 'Нет расходов за период' : 'Нет доходов за период'}
                </p>
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
                      <Tooltip formatter={(value: number) => formatAmt(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {pieData.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: chartColors[i % chartColors.length] }}
                          />
                          <span className="text-muted-foreground truncate max-w-[160px]">
                            {s.icon ? `${s.icon} ` : ''}{s.categoryName}
                          </span>
                        </div>
                        <span className="font-medium">{formatAmt(s.amount)} {defaultCurrency}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="mb-4">
          <FilterSheet value={filter} onChange={setFilter} />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Транзакций нет.</p>
            <Link to="/transactions/add" className="text-primary text-sm mt-2 block">
              Добавить первую
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ dateKey, label, items }) => (
              <div key={dateKey}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{label}</p>
                <div className="space-y-2">
                  {items.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      tx={tx}
                      accounts={accounts}
                      currentUserId={currentUserId}
                      onDelete={(id) => {
                        if (confirm('Удалить транзакцию?')) deleteMutation.mutate(id)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
