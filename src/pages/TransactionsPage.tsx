import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2, Pencil } from 'lucide-react'
import { transactionsApi, type Transaction, type TransactionFilter } from '@/api/transactions'
import { accountsApi, type Account } from '@/api/accounts'

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
  onDelete,
}: {
  tx: Transaction
  accounts: Account[]
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const account = accounts.find((a) => a.id === tx.accountId)
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null

  const amountColor =
    tx.type === 'income' ? 'text-green-600' : tx.type === 'transfer' ? 'text-blue-600' : 'text-red-500'
  const amountSign = tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '−'

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
        <span className={`text-sm font-semibold ${amountColor}`}>
          {amountSign}{tx.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {tx.currency}
        </span>
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

export function TransactionsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<TransactionFilter>({})
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
  })

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => transactionsApi.list(filter),
  })

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  function applyFilters() {
    setFilter({
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    })
    setShowFilters(false)
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setFilter({})
    setShowFilters(false)
  }

  const grouped = groupByDate(transactions)
  const hasFilters = !!(filter.dateFrom || filter.dateTo)

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
              ← Назад
            </Link>
            <h1 className="text-xl font-bold">Транзакции</h1>
          </div>
          <Link
            to="/transactions/add"
            className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
          >
            <Plus size={16} /> Добавить
          </Link>
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-md border ${
              hasFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'
            }`}
          >
            Фильтры {hasFilters ? '●' : ''}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground">
              Сбросить
            </button>
          )}
        </div>

        {showFilters && (
          <div className="bg-card rounded-lg border p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">С даты</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">По дату</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button
              onClick={applyFilters}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium"
            >
              Применить
            </button>
          </div>
        )}

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
