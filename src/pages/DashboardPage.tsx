import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Wallet, LogOut, List, Tag, Plus, TrendingDown, TrendingUp, Scale, LayoutList, ChevronDown, ShieldCheck } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'
import { accountsApi } from '@/api/accounts'
import { currenciesApi, type Currency } from '@/api/currencies'
import { authApi } from '@/api/auth'

type Period = 'month' | 'quarter' | 'year'
type ChartMode = 'balance' | 'expenses' | 'income'

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
}

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
]

function periodParams(period: Period): AnalyticsParams {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const today = fmt(now)
  let from: Date

  if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3
    from = new Date(now.getFullYear(), qStart, 1)
  } else {
    from = new Date(now.getFullYear(), 0, 1)
  }

  return { date_from: fmt(from), date_to: today }
}

function formatAmount(n: number, symbol?: string): string {
  const num = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(n)
  return symbol ? `${symbol} ${num}` : num
}

interface PieEntry {
  name: string
  amount: number
  icon?: string
}

function ChartBlock({
  data,
  sym,
  emptyText,
}: {
  data: PieEntry[]
  sym: string
  emptyText: string
}) {
  const positive = data.filter((d) => d.amount > 0)
  const negative = data.filter((d) => d.amount <= 0)

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
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
        {positive.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-muted-foreground truncate max-w-[160px]">
                {s.icon ? `${s.icon} ` : ''}{s.name}
              </span>
            </div>
            <span className="font-medium">{formatAmount(s.amount, sym)}</span>
          </div>
        ))}
        {negative.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-400" />
              <span className="text-muted-foreground truncate max-w-[160px]">
                {s.icon ? `${s.icon} ` : ''}{s.name}
              </span>
            </div>
            <span className="font-medium text-red-500">{formatAmount(s.amount, sym)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const updateUser = useAuthStore((s) => s.updateUser)
  const navigate = useNavigate()

  const [period, setPeriod] = useState<Period>('month')
  const [displayCurrency, setDisplayCurrency] = useState(user?.defaultCurrency ?? 'USD')
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [chartMode, setChartMode] = useState<ChartMode>('balance')

  const saveCurrency = useMutation({
    mutationFn: (code: string) => authApi.updateMe(code),
    onSuccess: (updatedUser) => updateUser(updatedUser),
  })
  const baseParams = periodParams(period)
  const params: AnalyticsParams = { ...baseParams, currency: displayCurrency }

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: currenciesApi.list,
    staleTime: 60_000,
  })

  const selectedCurrency: Currency | undefined = currencies.find((c) => c.code === displayCurrency)
  const sym = selectedCurrency?.symbol ?? displayCurrency

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary', params],
    queryFn: () => analyticsApi.summary(params),
  })

  const { data: byExpense = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'expense', params],
    queryFn: () => analyticsApi.byCategory({ ...params, type: 'expense' }),
  })

  const { data: byIncome = [] } = useQuery({
    queryKey: ['analytics', 'by-category', 'income', params],
    queryFn: () => analyticsApi.byCategory({ ...params, type: 'income' }),
  })

  const { data: byTag = [] } = useQuery({
    queryKey: ['analytics', 'by-tag', params],
    queryFn: () => analyticsApi.byTag(params),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', displayCurrency],
    queryFn: () => accountsApi.list(displayCurrency),
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const balancePieData: PieEntry[] = accounts
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
    <div className="min-h-screen bg-muted pb-20">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">co-wallet</h1>
          <div className="flex items-center gap-3">
            {/* Currency picker */}
            <div className="relative">
              <button
                onClick={() => setShowCurrencyPicker((v) => !v)}
                className="flex items-center gap-1 text-sm font-medium border rounded-md px-2 py-1 hover:bg-muted"
              >
                {selectedCurrency?.symbol ?? ''} {displayCurrency}
                <ChevronDown size={12} />
              </button>
              {showCurrencyPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCurrencyPicker(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-card border rounded-lg shadow-lg w-48 max-h-64 overflow-y-auto">
                    {currencies.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setDisplayCurrency(c.code)
                          setShowCurrencyPicker(false)
                          saveCurrency.mutate(c.code)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between ${c.code === displayCurrency ? 'text-primary font-medium' : ''}`}
                      >
                        <span>{c.code}</span>
                        <span className="text-xs text-muted-foreground">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut size={16} /> Выйти
            </button>
          </div>
        </div>

        {/* Period switcher */}
        <div className="flex gap-1 bg-card rounded-lg border p-1 mb-4">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Summary cards — clickable to switch chart */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setChartMode('balance')}
            className={`bg-card rounded-lg border p-3 text-left transition-all ${
              chartMode === 'balance' ? 'ring-2 ring-primary border-primary' : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Scale size={14} />
              <span className="text-xs">Баланс</span>
            </div>
            <p className="text-sm font-semibold truncate">{formatAmount(summary?.balance ?? 0, sym)}</p>
          </button>
          <button
            onClick={() => setChartMode('expenses')}
            className={`bg-card rounded-lg border p-3 text-left transition-all ${
              chartMode === 'expenses' ? 'ring-2 ring-red-500 border-red-400' : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-1 text-red-500 mb-1">
              <TrendingDown size={14} />
              <span className="text-xs">Расходы</span>
            </div>
            <p className="text-sm font-semibold text-red-600 truncate">{formatAmount(summary?.expenses ?? 0, sym)}</p>
          </button>
          <button
            onClick={() => setChartMode('income')}
            className={`bg-card rounded-lg border p-3 text-left transition-all ${
              chartMode === 'income' ? 'ring-2 ring-green-500 border-green-400' : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-1 text-green-600 mb-1">
              <TrendingUp size={14} />
              <span className="text-xs">Доходы</span>
            </div>
            <p className="text-sm font-semibold text-green-700 truncate">{formatAmount(summary?.income ?? 0, sym)}</p>
          </button>
        </div>

        {/* Pie chart block */}
        <div className="bg-card rounded-lg border p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">{chartTitles[chartMode]}</h2>
          <ChartBlock
            data={activePieData}
            sym={sym}
            emptyText={chartEmptyTexts[chartMode]}
          />
        </div>

        {/* Tags breakdown */}
        {byTag.length > 0 && (
          <div className="bg-card rounded-lg border p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3">Расходы по тегам</h2>
            <div className="space-y-2">
              {byTag.slice(0, 6).map((s) => (
                <div key={s.tagId} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">#{s.tagName}</span>
                  <span className="font-medium">{formatAmount(s.amount, sym)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/accounts"
            className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 hover:bg-muted"
          >
            <Wallet size={24} className="text-primary" />
            <span className="text-sm font-medium">Счета</span>
          </Link>
          <Link
            to="/transactions"
            className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 hover:bg-muted"
          >
            <List size={24} className="text-primary" />
            <span className="text-sm font-medium">Транзакции</span>
          </Link>
          <Link
            to="/tags"
            className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 hover:bg-muted"
          >
            <Tag size={24} className="text-primary" />
            <span className="text-sm font-medium">Теги</span>
          </Link>
          <Link
            to="/categories"
            className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 hover:bg-muted"
          >
            <LayoutList size={24} className="text-primary" />
            <span className="text-sm font-medium">Категории</span>
          </Link>
          {user?.isAdmin && (
            <Link
              to="/admin"
              className="bg-card rounded-lg border p-4 flex flex-col items-center gap-2 hover:bg-muted col-span-2"
            >
              <ShieldCheck size={24} className="text-primary" />
              <span className="text-sm font-medium">Администрирование</span>
            </Link>
          )}
        </div>

        {/* Greeting */}
        <div className="bg-card rounded-lg border p-3 mt-3 text-xs text-muted-foreground">
          {user?.username}  ·  {user?.email}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <Link
          to="/transactions/add"
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90"
        >
          <Plus size={24} />
        </Link>
      </div>
    </div>
  )
}
