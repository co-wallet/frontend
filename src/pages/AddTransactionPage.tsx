import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, type CreateTransactionDto, type TransactionType } from '@/api/transactions'
import { accountsApi, type Account, type AccountMember } from '@/api/accounts'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { currenciesApi } from '@/api/currencies'
import { TagInput } from '@/components/TagInput'
import { useAuthStore } from '@/store/authStore'
import { cn, parseDecimal, filterDecimalInput, isValidDecimal } from '@/lib/utils'

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
  { value: 'transfer', label: 'Перевод' },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function roundCents(v: number): number {
  return Math.round(v * 100) / 100
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = []
  function walk(items: CategoryNode[]) {
    for (const n of items) {
      result.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return result
}

export function AddTransactionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const userDefaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'USD')

  const [type, setType] = useState<TransactionType>('expense')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [defaultCurrencyAmountStr, setDefaultCurrencyAmountStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(searchParams.get('date') || todayISO())
  const [includeInBalance, setIncludeInBalance] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const pendingTagRef = useRef('')

  // Shares
  const [customShares, setCustomShares] = useState(false)
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({})

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const accountCurrencyCodes = accounts.map((a) => a.currency)
  const extraCodes = [...new Set([userDefaultCurrency, ...accountCurrencyCodes])]
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies', extraCodes.sort().join(',')],
    queryFn: () => currenciesApi.list(extraCodes),
    staleTime: 60_000,
  })

  const selectedAccount: Account | undefined = accounts.find((a) => a.id === accountId)
  const isShared = selectedAccount?.type === 'shared'

  const { data: members = [] } = useQuery<AccountMember[]>({
    queryKey: ['account-members', accountId],
    queryFn: () => accountsApi.getMembers(accountId),
    enabled: !!accountId && isShared,
  })

  const catType = type === 'income' ? 'income' : 'expense'
  const { data: categoryTree = [] } = useQuery({
    queryKey: ['categories', catType],
    queryFn: () => categoriesApi.list(catType),
    enabled: type !== 'transfer',
  })
  const flatCategories = flattenCategories(categoryTree)

  // Auto-distribute shares when amount or members change
  useEffect(() => {
    if (!isShared || !members.length || customShares) return
    const total = parseDecimal(amount)
    if (total <= 0) return
    const newAmounts: Record<string, string> = {}
    let distributed = 0
    members.forEach((m, i) => {
      if (i < members.length - 1) {
        const share = roundCents(total * m.defaultShare)
        distributed += share
        newAmounts[m.userId] = String(share)
      } else {
        newAmounts[m.userId] = String(roundCents(total - distributed))
      }
    })
    setShareAmounts(newAmounts)
  }, [amount, members, isShared, customShares])

  // Reset shares when switching account
  useEffect(() => {
    setCustomShares(false)
    setShareAmounts({})
  }, [accountId])

  // Reset categoryId when switching type
  useEffect(() => {
    setCategoryId('')
  }, [type])

  // Auto-compute default currency amount when amount or account changes
  const accountCurrency = selectedAccount?.currency ?? ''
  const needsDefaultCurrency = !!accountCurrency && accountCurrency !== userDefaultCurrency
  useEffect(() => {
    if (!needsDefaultCurrency) {
      setDefaultCurrencyAmountStr('')
      return
    }
    const total = parseDecimal(amount)
    if (total <= 0) {
      setDefaultCurrencyAmountStr('')
      return
    }
    const acctRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
    const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
    if (acctRate <= 0 || defRate <= 0) return
    const converted = roundCents(total * defRate / acctRate)
    setDefaultCurrencyAmountStr(String(converted))
  }, [amount, accountCurrency, userDefaultCurrency, currencies, needsDefaultCurrency])

  const sharesSum = Object.values(shareAmounts).reduce((s, v) => s + parseDecimal(v), 0)
  const totalAmount = parseDecimal(amount)
  const amountValid = isValidDecimal(amount) && totalAmount > 0
  const sharesValid = !isShared || members.length <= 1 || Math.abs(sharesSum - totalAmount) <= 0.01

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      navigate('/transactions')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amountValid || !sharesValid) return

    const pendingTrimmed = pendingTagRef.current.trim().toLowerCase()
    const allTags = pendingTrimmed && !tags.includes(pendingTrimmed)
      ? [...tags, pendingTrimmed]
      : tags

    const txCurrency = selectedAccount?.currency ?? userDefaultCurrency
    const dcaValue = parseDecimal(defaultCurrencyAmountStr)
    const dto: CreateTransactionDto = {
      accountId,
      type,
      amount: totalAmount,
      currency: txCurrency,
      date: date + 'T00:00:00Z',
      includeInBalance,
      ...(categoryId ? { categoryId } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(type === 'transfer' && toAccountId ? { toAccountId } : {}),
      ...(allTags.length > 0 ? { tags: allTags } : {}),
      ...(needsDefaultCurrency && dcaValue > 0
        ? { defaultCurrency: userDefaultCurrency, defaultCurrencyAmount: dcaValue }
        : {}),
    }

    if (isShared && members.length > 1) {
      dto.shares = members.map((m) => ({
        userId: m.userId,
        amount: parseDecimal(shareAmounts[m.userId] ?? '0'),
      }))
    }

    createMutation.mutate(dto)
  }

  const otherAccounts = accounts.filter((a) => a.id !== accountId)

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/transactions" className="text-muted-foreground hover:text-foreground text-sm">
            ← Назад
          </Link>
          <h1 className="text-xl font-bold">Новая транзакция</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex-1 py-2 rounded-md border text-sm font-medium',
                    type === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium mb-1">Счёт</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-card"
            >
              <option value="">Выберите счёт</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon ? `${a.icon} ` : ''}{a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          {/* To account (transfer only) */}
          {type === 'transfer' && (
            <div>
              <label className="block text-sm font-medium mb-1">На счёт</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-card"
              >
                <option value="">Выберите счёт</option>
                {otherAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon ? `${a.icon} ` : ''}{a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Сумма {selectedAccount ? `(${selectedAccount.currency})` : ''}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(filterDecimalInput(e.target.value))}
              required
              placeholder="0.00"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {selectedAccount && (() => {
              if (selectedAccount.currency === userDefaultCurrency) return null
              const acctRate = currencies.find((c) => c.code === selectedAccount.currency)?.rateToUsd ?? 0
              const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
              if (acctRate <= 0 || defRate <= 0) return null
              const rate = (acctRate / defRate).toFixed(4)
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  1 {userDefaultCurrency} = {rate} {selectedAccount.currency}
                </p>
              )
            })()}
          </div>

          {/* Default currency amount (only when account currency differs from user default) */}
          {needsDefaultCurrency && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Сумма в {userDefaultCurrency}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultCurrencyAmountStr}
                  onChange={(e) => setDefaultCurrencyAmountStr(filterDecimalInput(e.target.value))}
                  placeholder="0.00"
                  className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    const total = parseDecimal(amount)
                    if (total <= 0) return
                    const acctRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
                    const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
                    if (acctRate <= 0 || defRate <= 0) return
                    setDefaultCurrencyAmountStr(String(roundCents(total * defRate / acctRate)))
                  }}
                  className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Пересчитать по текущему курсу"
                >
                  ↻
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Автоматически рассчитано по текущему курсу. Можно скорректировать вручную.
              </p>
            </div>
          )}

          {/* Category (not for transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-sm font-medium mb-1">Категория</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-card"
              >
                <option value="">Выберите категорию</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">Теги</label>
            <TagInput value={tags} onChange={setTags} onPendingChange={(v) => { pendingTagRef.current = v }} />
          </div>

          {/* Include in balance */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInBalance}
              onChange={(e) => setIncludeInBalance(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Учитывать в балансе</span>
          </label>

          {/* Shares (shared accounts with >1 member) */}
          {isShared && members.length > 1 && (
            <div className="bg-card rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Распределение долей</p>
                <button
                  type="button"
                  onClick={() => setCustomShares((v) => !v)}
                  className="text-xs text-primary underline"
                >
                  {customShares ? 'Авто' : 'Настроить'}
                </button>
              </div>
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground flex-1 truncate">{m.username}</span>
                  {customShares ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={shareAmounts[m.userId] ?? ''}
                      onChange={(e) => {
                        const newVal = filterDecimalInput(e.target.value)
                        const newAmt = parseDecimal(newVal)
                        setShareAmounts((prev) => {
                          const others = members.filter((om) => om.userId !== m.userId)
                          const otherSum = others.reduce((s, om) => s + parseDecimal(prev[om.userId] ?? '0'), 0)
                          const remaining = Math.max(0, totalAmount - newAmt)
                          const next: Record<string, string> = { ...prev, [m.userId]: newVal }
                          if (others.length === 0) return next
                          if (otherSum > 0.01) {
                            let distributed = 0
                            others.forEach((om, i) => {
                              if (i < others.length - 1) {
                                const part = roundCents(parseDecimal(prev[om.userId] ?? '0') * remaining / otherSum)
                                next[om.userId] = String(part)
                                distributed += part
                              } else {
                                next[om.userId] = String(roundCents(remaining - distributed))
                              }
                            })
                          } else {
                            let distributed = 0
                            others.forEach((om, i) => {
                              if (i < others.length - 1) {
                                const part = roundCents(remaining / others.length)
                                next[om.userId] = String(part)
                                distributed += part
                              } else {
                                next[om.userId] = String(roundCents(remaining - distributed))
                              }
                            })
                          }
                          return next
                        })
                      }}
                      className="w-28 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary text-right"
                    />
                  ) : (
                    <span className="text-sm font-medium">
                      {shareAmounts[m.userId] ?? '0.00'} {selectedAccount?.currency}
                    </span>
                  )}
                </div>
              ))}
              {customShares && !sharesValid && (
                <p className="text-xs text-destructive">
                  Сумма долей ({sharesSum.toFixed(2)}) должна равняться сумме транзакции ({totalAmount.toFixed(2)})
                </p>
              )}
            </div>
          )}

          {createMutation.error && (
            <p className="text-sm text-destructive">Ошибка. Проверьте данные и попробуйте ещё раз.</p>
          )}

          <div className="flex gap-2 pt-2">
            <Link
              to="/transactions"
              className="flex-1 rounded-md border py-2.5 text-sm font-medium text-center hover:bg-muted"
            >
              Отмена
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending || !amountValid || !sharesValid}
              className="flex-1 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
