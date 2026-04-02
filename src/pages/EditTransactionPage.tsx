import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, type UpdateTransactionDto } from '@/api/transactions'
import { accountsApi, type AccountMember } from '@/api/accounts'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { currenciesApi } from '@/api/currencies'
import { TagInput } from '@/components/TagInput'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput, isValidDecimal } from '@/lib/utils'

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

function roundCents(v: number): number {
  return Math.round(v * 100) / 100
}

export function EditTransactionPage() {
  const { txID } = useParams<{ txID: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const userDefaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'USD')

  const [amount, setAmount] = useState('')
  const [defaultCurrencyAmountStr, setDefaultCurrencyAmountStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [includeInBalance, setIncludeInBalance] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const pendingTagRef = useRef('')
  const [customShares, setCustomShares] = useState(false)
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)

  const { data: tx, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', txID],
    queryFn: () => transactionsApi.get(txID!),
    enabled: !!txID,
  })

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

  const selectedAccount = accounts.find((a) => a.id === tx?.accountId)
  const isShared = selectedAccount?.type === 'shared'

  const { data: members = [] } = useQuery<AccountMember[]>({
    queryKey: ['account-members', tx?.accountId],
    queryFn: () => accountsApi.getMembers(tx!.accountId),
    enabled: !!tx?.accountId && isShared,
  })

  const catType = tx?.type === 'income' ? 'income' : 'expense'
  const { data: categoryTree = [] } = useQuery({
    queryKey: ['categories', catType],
    queryFn: () => categoriesApi.list(catType),
    enabled: !!tx && tx.type !== 'transfer',
  })
  const flatCategories = flattenCategories(categoryTree)

  // Initialize form when tx loads
  useEffect(() => {
    if (!tx || initialized) return
    setAmount(String(tx.amount))
    setCategoryId(tx.categoryId ?? '')
    setDescription(tx.description ?? '')
    setDate(tx.date.slice(0, 10))
    setIncludeInBalance(tx.includeInBalance)
    setTags(tx.tags?.map((t) => t.name) ?? [])
    if (tx.defaultCurrencyAmount != null) {
      setDefaultCurrencyAmountStr(String(tx.defaultCurrencyAmount))
    }

    if (tx.shares.length > 0) {
      const hasCustom = tx.shares.some((s) => s.isCustom)
      setCustomShares(hasCustom)
      const map: Record<string, string> = {}
      for (const s of tx.shares) map[s.userId] = String(s.amount)
      setShareAmounts(map)
    }
    setInitialized(true)
  }, [tx, initialized])

  // Auto-recalculate shares when amount changes in auto mode
  useEffect(() => {
    if (!isShared || !members.length || customShares || !initialized) return
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
  }, [amount, members, isShared, customShares, initialized])

  const totalAmount = parseDecimal(amount)
  const amountValid = isValidDecimal(amount) && totalAmount > 0
  const sharesSum = Object.values(shareAmounts).reduce((s, v) => s + parseDecimal(v), 0)
  const sharesValid = !isShared || members.length <= 1 || Math.abs(sharesSum - totalAmount) <= 0.01

  const accountCurrency = selectedAccount?.currency ?? tx?.currency ?? ''
  const needsDefaultCurrency = !!accountCurrency && accountCurrency !== userDefaultCurrency

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateTransactionDto) => transactionsApi.update(txID!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      navigate(-1)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amountValid || !sharesValid) return

    const pendingTrimmed = pendingTagRef.current.trim().toLowerCase()
    const allTags = pendingTrimmed && !tags.includes(pendingTrimmed)
      ? [...tags, pendingTrimmed]
      : tags

    const dcaValue = parseDecimal(defaultCurrencyAmountStr)
    const dto: UpdateTransactionDto = {
      amount: totalAmount,
      categoryId: categoryId || null,
      description: description.trim() || null,
      date: date + 'T00:00:00Z',
      includeInBalance,
      tags: allTags,
      ...(needsDefaultCurrency
        ? { defaultCurrency: userDefaultCurrency, defaultCurrencyAmount: dcaValue > 0 ? dcaValue : null }
        : {}),
    }

    if (isShared && members.length > 1) {
      dto.shares = members.map((m) => ({
        userId: m.userId,
        amount: parseDecimal(shareAmounts[m.userId] ?? '0'),
      }))
    }

    updateMutation.mutate(dto)
  }

  if (txLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Транзакция не найдена</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground text-sm">
            ← Назад
          </button>
          <h1 className="text-xl font-bold">Редактировать</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Сумма {selectedAccount ? `(${selectedAccount.currency})` : `(${tx.currency})`}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(filterDecimalInput(e.target.value))}
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {(() => {
              if (accountCurrency === userDefaultCurrency) return null
              const acctRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
              const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
              if (acctRate <= 0 || defRate <= 0) return null
              const rate = acctRate / defRate
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  {rate >= 1
                    ? `1 ${userDefaultCurrency} = ${rate.toFixed(4)} ${accountCurrency}`
                    : `1 ${accountCurrency} = ${(1 / rate).toFixed(4)} ${userDefaultCurrency}`}
                </p>
              )
            })()}
          </div>

          {/* Default currency amount */}
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
                Сумма в валюте пользователя. Можно пересчитать по текущему курсу.
              </p>
            </div>
          )}

          {/* Category (not for transfer) */}
          {tx.type !== 'transfer' && (
            <div>
              <label className="block text-sm font-medium mb-1">Категория</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary bg-card"
              >
                <option value="">Без категории</option>
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

          {/* Shares */}
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
                      {shareAmounts[m.userId] ?? '0.00'} {tx.currency}
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

          {updateMutation.error && (
            <p className="text-sm text-destructive">Ошибка. Проверьте данные и попробуйте ещё раз.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-md border py-2.5 text-sm font-medium text-center hover:bg-muted"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !amountValid || !sharesValid}
              className="flex-1 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
