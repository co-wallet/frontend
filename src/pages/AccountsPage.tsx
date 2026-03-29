import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, Users, Trash2, Pencil } from 'lucide-react'
import { accountsApi, type CreateAccountDto, type Account } from '@/api/accounts'
import { currenciesApi } from '@/api/currencies'
import { useAuthStore } from '@/store/authStore'
import { cn, parseDecimal } from '@/lib/utils'
const ICONS = ['💳', '💵', '🏦', '💰', '📈', '🏠', '🚗', '✈️']

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function AccountForm({
  initial,
  defaultCurrency,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<CreateAccountDto>
  defaultCurrency: string
  onSubmit: (dto: CreateAccountDto) => void
  onCancel: () => void
  loading: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<'personal' | 'shared'>(initial?.type ?? 'personal')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [icon, setIcon] = useState(initial?.icon ?? '💳')
  const [includeInBalance, setIncludeInBalance] = useState(initial?.includeInBalance ?? true)
  const [initialBalance, setInitialBalance] = useState(
    initial?.initialBalance ? String(initial.initialBalance) : ''
  )
  const [initialBalanceDate, setInitialBalanceDate] = useState(
    initial?.initialBalanceDate
      ? initial.initialBalanceDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: currenciesApi.list,
    staleTime: 60_000,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, type, currency, icon, includeInBalance, initialBalance: parseDecimal(initialBalance), initialBalanceDate })
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Название</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Например: Карта Сбер"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Иконка</label>
        <div className="flex gap-2 flex-wrap">
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={cn(
                'w-9 h-9 rounded-md border text-lg flex items-center justify-center',
                icon === i ? 'border-primary ring-2 ring-primary' : 'border-border',
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Тип</label>
        <div className="flex gap-2">
          {(['personal', 'shared'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-2 rounded-md border text-sm font-medium',
                type === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground',
              )}
            >
              {t === 'personal' ? 'Личный' : 'Совместный'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Валюта</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          {currencies.length > 0
            ? currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                </option>
              ))
            : ['RUB', 'USD', 'EUR', 'GBP', 'CNY'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))
          }
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Начальный баланс</label>
          <input
            type="text"
            inputMode="decimal"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Дата баланса</label>
          <input
            type="date"
            value={initialBalanceDate}
            onChange={(e) => setInitialBalanceDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeInBalance}
          onChange={(e) => setIncludeInBalance(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm">Учитывать в общем балансе</span>
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account
  onEdit: (a: Account) => void
  onDelete: (id: string) => void
}) {
  const user = useAuthStore((s) => s.user)
  const isOwner = account.ownerId === user?.id

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <Link to={`/accounts/${account.id}`} className="flex items-center gap-3 flex-1">
          <span className="text-2xl">{account.icon ?? '💳'}</span>
          <div>
            <p className="font-medium">{account.name}</p>
            <p className="text-xs text-muted-foreground">
              {account.type === 'shared' ? 'Совместный' : 'Личный'} · {account.currency}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1 ml-2">
          {account.type === 'shared' && (
            <Link
              to={`/accounts/${account.id}/members`}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            >
              <Users size={16} />
            </Link>
          )}
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <Pencil size={16} />
          </button>
          {isOwner && (
            <button
              onClick={() => onDelete(account.id)}
              className="p-1.5 rounded-md hover:bg-muted text-destructive"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {account.balance && (
        <div className="mt-3 pt-3 border-t border-border">
          {account.type === 'shared' ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Мой баланс</p>
                <p className="font-medium">{fmtCurrency(account.balance.native, account.currency)}</p>
                {account.balance.displayCurrency !== account.currency && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {fmtCurrency(account.balance.display, account.balance.displayCurrency)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Всего на счёте</p>
                <p className="font-medium">{fmtCurrency(account.balance.totalNative, account.currency)}</p>
                {account.balance.displayCurrency !== account.currency && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {fmtCurrency(account.balance.totalDisplay, account.balance.displayCurrency)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <p className="font-medium">{fmtCurrency(account.balance.native, account.currency)}</p>
              {account.balance.displayCurrency !== account.currency && (
                <p className="text-xs text-muted-foreground">
                  ≈ {fmtCurrency(account.balance.display, account.balance.displayCurrency)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {!account.includeInBalance && (
        <p className="mt-2 text-xs text-muted-foreground">Не учитывается в балансе</p>
      )}
    </div>
  )
}

export function AccountsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const defaultCurrency = user?.defaultCurrency ?? 'USD'
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', defaultCurrency],
    queryFn: () => accountsApi.list(defaultCurrency),
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setShowCreateForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateAccountDto }) =>
      accountsApi.update(id, {
        name: dto.name,
        icon: dto.icon,
        includeInBalance: dto.includeInBalance,
        initialBalance: dto.initialBalance,
        initialBalanceDate: dto.initialBalanceDate,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setEditingAccount(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
              ← Назад
            </Link>
            <h1 className="text-xl font-bold">Счета</h1>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); setEditingAccount(null) }}
            className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
          >
            <Plus size={16} /> Добавить
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-card rounded-lg border p-4 mb-4">
            <h2 className="font-semibold mb-4">Новый счёт</h2>
            <AccountForm
              defaultCurrency={defaultCurrency}
              onSubmit={(dto) => createMutation.mutate(dto)}
              onCancel={() => setShowCreateForm(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {editingAccount && (
          <div className="bg-card rounded-lg border p-4 mb-4">
            <h2 className="font-semibold mb-4">Редактировать счёт</h2>
            <AccountForm
              initial={{ ...editingAccount, icon: editingAccount.icon ?? undefined }}
              defaultCurrency={defaultCurrency}
              onSubmit={(dto) => updateMutation.mutate({ id: editingAccount.id, dto })}
              onCancel={() => setEditingAccount(null)}
              loading={updateMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет счетов. Создайте первый!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                onEdit={(a) => { setEditingAccount(a); setShowCreateForm(false) }}
                onDelete={(id) => {
                  if (confirm('Удалить счёт?')) deleteMutation.mutate(id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
