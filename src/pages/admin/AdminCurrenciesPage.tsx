import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Plus, Coins } from 'lucide-react'
import { adminApi, type AdminCurrency } from '@/api/admin'
import { cn } from '@/lib/utils'

function AddCurrencyForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createCurrency({ code: code.toUpperCase(), name, symbol: symbol || undefined, isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'currencies'] }); onClose() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setApiError(err?.response?.data?.error ?? 'Ошибка при создании валюты')
    },
  })

  return (
    <div className="bg-card rounded-lg border p-4 mb-4">
      <h2 className="font-semibold mb-3">Новая валюта</h2>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); setApiError(null); mutation.mutate() }}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Код (ISO)</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={3}
              required
              placeholder="USD"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Символ</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={5}
              placeholder="$"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="US Dollar"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          Активна
        </label>
        {apiError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{apiError}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border py-2 text-sm hover:bg-muted"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Сохранение...' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CurrencyRow({ currency }: { currency: AdminCurrency }) {
  const qc = useQueryClient()
  const toggle = useMutation({
    mutationFn: () => adminApi.updateCurrency(currency.code, { isActive: !currency.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'currencies'] }),
  })

  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={cn('w-2 h-2 rounded-full', currency.isActive ? 'bg-green-500' : 'bg-muted-foreground')} />
        <div>
          <span className="font-medium text-sm">{currency.code}</span>
          {currency.symbol && (
            <span className="text-muted-foreground text-sm ml-1">({currency.symbol})</span>
          )}
          <p className="text-xs text-muted-foreground">{currency.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {currency.rateToUsd > 0 && (
          <span className="text-xs text-muted-foreground">
            1 USD = {currency.rateToUsd.toFixed(4)} {currency.code}
          </span>
        )}
        <button
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          className={cn(
            'text-xs px-2 py-1 rounded-md border font-medium transition-colors',
            currency.isActive
              ? 'text-muted-foreground hover:text-destructive hover:border-destructive'
              : 'text-green-600 hover:bg-green-50 border-green-300',
          )}
        >
          {currency.isActive ? 'Отключить' : 'Включить'}
        </button>
      </div>
    </div>
  )
}

export function AdminCurrenciesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['admin', 'currencies'],
    queryFn: adminApi.listCurrencies,
  })

  const refresh = useMutation({
    mutationFn: adminApi.refreshRates,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'currencies'] }),
  })

  const active = currencies.filter((c) => c.isActive)
  const inactive = currencies.filter((c) => !c.isActive)

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground text-sm">
              ← Назад
            </Link>
            <div className="flex items-center gap-2">
              <Coins size={20} />
              <h1 className="text-xl font-bold">Валюты</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={14} className={refresh.isPending ? 'animate-spin' : ''} />
              Обновить курсы
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-md px-3 py-1.5"
            >
              <Plus size={14} /> Добавить
            </button>
          </div>
        </div>

        {showAdd && <AddCurrencyForm onClose={() => setShowAdd(false)} />}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            {active.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Активные ({active.length})
                </p>
                <div className="space-y-2">
                  {active.map((c) => <CurrencyRow key={c.code} currency={c} />)}
                </div>
              </div>
            )}
            {inactive.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Отключённые ({inactive.length})
                </p>
                <div className="space-y-2">
                  {inactive.map((c) => <CurrencyRow key={c.code} currency={c} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
