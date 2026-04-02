import { useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2, Pencil, Users } from 'lucide-react'
import { transactionsApi, type Transaction, type TransactionFilter } from '@/api/transactions'
import { accountsApi, type Account } from '@/api/accounts'
import { FilterSheet } from '@/components/FilterSheet'
import { useAuthStore } from '@/store/authStore'

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

  const isShared = account?.type === 'shared'
  const userShare = isShared && currentUserId
    ? tx.shares?.find((s) => s.userId === currentUserId)
    : null
  const showShare = isShared && userShare != null && userShare.amount !== tx.amount

  const displayAmount = showShare ? userShare!.amount : tx.amount

  // For shared cross-currency transactions, compute user's share in default currency
  const defaultCurrencyDisplay = tx.defaultCurrencyAmount != null && tx.defaultCurrency != null
    ? (showShare
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
          <span
            className={`text-sm font-semibold ${amountColor} inline-flex items-center gap-1`}
            title={showShare ? `Всего: ${amountSign}${formatAmt(tx.amount)} ${tx.currency}` : undefined}
          >
            {showShare && <Users size={12} className="text-muted-foreground" />}
            {amountSign}{formatAmt(displayAmount)} {tx.currency}
          </span>
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

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => transactionsApi.list(filter),
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

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
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
