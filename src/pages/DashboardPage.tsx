import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Wallet, LogOut, List, Tag, Plus, TrendingDown, TrendingUp, Scale } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { analyticsApi, type AnalyticsParams } from '@/api/analytics'

type Period = 'month' | 'quarter' | 'year'

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

function formatAmount(n: number): string {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [period, setPeriod] = useState<Period>('month')
  const params = periodParams(period)

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary', params],
    queryFn: () => analyticsApi.summary(params),
  })

  const { data: byCategory = [] } = useQuery({
    queryKey: ['analytics', 'by-category', params],
    queryFn: () => analyticsApi.byCategory(params),
  })

  const { data: byTag = [] } = useQuery({
    queryKey: ['analytics', 'by-tag', params],
    queryFn: () => analyticsApi.byTag(params),
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const pieData = byCategory.filter((s) => s.amount > 0).slice(0, 8)

  return (
    <div className="min-h-screen bg-muted pb-20">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">co-wallet</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut size={16} /> Выйти
          </button>
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

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-card rounded-lg border p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Scale size={14} />
              <span className="text-xs">Баланс</span>
            </div>
            <p className="text-sm font-semibold truncate">{formatAmount(summary?.balance ?? 0)}</p>
          </div>
          <div className="bg-card rounded-lg border p-3">
            <div className="flex items-center gap-1 text-red-500 mb-1">
              <TrendingDown size={14} />
              <span className="text-xs">Расходы</span>
            </div>
            <p className="text-sm font-semibold text-red-600 truncate">{formatAmount(summary?.expenses ?? 0)}</p>
          </div>
          <div className="bg-card rounded-lg border p-3">
            <div className="flex items-center gap-1 text-green-600 mb-1">
              <TrendingUp size={14} />
              <span className="text-xs">Доходы</span>
            </div>
            <p className="text-sm font-semibold text-green-700 truncate">{formatAmount(summary?.income ?? 0)}</p>
          </div>
        </div>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-card rounded-lg border p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3">Расходы по категориям</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  labelFormatter={(label) => String(label)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {pieData.map((s, i) => (
                <div key={s.categoryId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[140px]">
                      {s.icon ? `${s.icon} ` : ''}{s.categoryName}
                    </span>
                  </div>
                  <span className="font-medium">{formatAmount(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags breakdown */}
        {byTag.length > 0 && (
          <div className="bg-card rounded-lg border p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3">Расходы по тегам</h2>
            <div className="space-y-2">
              {byTag.slice(0, 6).map((s) => (
                <div key={s.tagId} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">#{s.tagName}</span>
                  <span className="font-medium">{formatAmount(s.amount)}</span>
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
