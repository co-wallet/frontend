import { useState, useEffect, useRef } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonButton, IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonInput, IonSelect, IonSelectOption, IonToggle,
  IonSpinner, IonText, IonNote, IonIcon,
} from '@ionic/react'
import { refreshOutline } from 'ionicons/icons'
import { transactionsApi, type CreateTransactionDto, type TransactionType } from '@/api/transactions'
import { accountsApi, type Account, type AccountMember } from '@/api/accounts'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { currenciesApi } from '@/api/currencies'
import { TagInput } from '@/components/TagInput'
import { AccountSelect } from '@/components/AccountSelect'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput, isValidDecimal } from '@/lib/decimal'

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
  const history = useHistory()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const qc = useQueryClient()
  const userDefaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'USD')

  const [type, setType] = useState<TransactionType>('expense')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [defaultCurrencyAmountStr, setDefaultCurrencyAmountStr] = useState('')
  const [toAmountStr, setToAmountStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(searchParams.get('date') || todayISO())
  const [includeInBalance, setIncludeInBalance] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const pendingTagRef = useRef('')

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

  useEffect(() => {
    setCustomShares(false)
    setShareAmounts({})
  }, [accountId])

  useEffect(() => {
    setCategoryId('')
  }, [type])

  const accountCurrency = selectedAccount?.currency ?? ''
  const toAccount = accounts.find((a) => a.id === toAccountId)
  const toAccountCurrency = toAccount?.currency ?? ''
  const isCrossCurrencyTransfer = type === 'transfer' && !!toAccountCurrency && toAccountCurrency !== accountCurrency
  const needsDefaultCurrency = (!!accountCurrency && accountCurrency !== userDefaultCurrency) || isCrossCurrencyTransfer

  useEffect(() => {
    if (!isCrossCurrencyTransfer) {
      setToAmountStr('')
      return
    }
    const total = parseDecimal(amount)
    if (total <= 0) {
      setToAmountStr('')
      return
    }
    const fromRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
    const toRate = currencies.find((c) => c.code === toAccountCurrency)?.rateToUsd ?? 0
    if (fromRate <= 0 || toRate <= 0) return
    setToAmountStr(String(roundCents(total * toRate / fromRate)))
  }, [amount, accountCurrency, toAccountCurrency, isCrossCurrencyTransfer, currencies])

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
    if (accountCurrency === userDefaultCurrency) {
      setDefaultCurrencyAmountStr(String(total))
      return
    }
    const acctRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
    const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
    if (acctRate <= 0 || defRate <= 0) return
    const converted = roundCents(total * defRate / acctRate)
    setDefaultCurrencyAmountStr(String(converted))
  }, [amount, accountCurrency, toAccountCurrency, userDefaultCurrency, currencies, needsDefaultCurrency])

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
      qc.invalidateQueries({ queryKey: ['tags'] })
      history.push('/transactions')
    },
  })

  function handleSubmit() {
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
      ...(type === 'transfer' && toAccountId ? { toAccountId, ...(isCrossCurrencyTransfer && parseDecimal(toAmountStr) > 0 ? { toAmount: parseDecimal(toAmountStr) } : {}) } : {}),
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

  function renderCurrencyRate() {
    if (!selectedAccount) return null
    if (isCrossCurrencyTransfer) {
      const fromRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
      const toRate = currencies.find((c) => c.code === toAccountCurrency)?.rateToUsd ?? 0
      if (fromRate <= 0 || toRate <= 0) return null
      const rate = toRate / fromRate
      return (
        <IonNote style={{ fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
          {rate >= 1
            ? `1 ${accountCurrency} = ${rate.toFixed(4)} ${toAccountCurrency}`
            : `1 ${toAccountCurrency} = ${(1 / rate).toFixed(4)} ${accountCurrency}`}
        </IonNote>
      )
    }
    if (selectedAccount.currency === userDefaultCurrency) return null
    const acctRate = currencies.find((c) => c.code === selectedAccount.currency)?.rateToUsd ?? 0
    const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
    if (acctRate <= 0 || defRate <= 0) return null
    const rate = acctRate / defRate
    return (
      <IonNote style={{ fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
        {rate >= 1
          ? `1 ${userDefaultCurrency} = ${rate.toFixed(4)} ${selectedAccount.currency}`
          : `1 ${selectedAccount.currency} = ${(1 / rate).toFixed(4)} ${userDefaultCurrency}`}
      </IonNote>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/transactions" text="Назад" />
          </IonButtons>
          <IonTitle>Новая транзакция</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={type}
            onIonChange={(e) => setType(e.detail.value as TransactionType)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <IonSegmentButton key={opt.value} value={opt.value}>
                <IonLabel>{opt.label}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="ion-padding">
          <IonList>
            {/* Account */}
            <AccountSelect
              label="Счёт"
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
            />

            {/* To account (transfer) */}
            {type === 'transfer' && (
              <AccountSelect
                label="На счёт"
                accounts={otherAccounts}
                value={toAccountId}
                onChange={setToAccountId}
              />
            )}

            {/* Amount */}
            <IonItem>
              <IonInput
                label={`Сумма${selectedAccount ? ` (${selectedAccount.currency})` : ''}`}
                labelPlacement="floating"
                type="text"
                inputMode="decimal"
                value={amount}
                placeholder="0.00"
                onIonInput={(e) => setAmount(filterDecimalInput(e.detail.value ?? ''))}
              />
            </IonItem>
            {renderCurrencyRate()}

            {/* To-amount (cross-currency transfer) */}
            {isCrossCurrencyTransfer && (
              <>
                <IonItem>
                  <IonInput
                    label={`Сумма на счёт (${toAccountCurrency})`}
                    labelPlacement="floating"
                    type="text"
                    inputMode="decimal"
                    value={toAmountStr}
                    placeholder="0.00"
                    onIonInput={(e) => setToAmountStr(filterDecimalInput(e.detail.value ?? ''))}
                  />
                  <IonButton
                    slot="end"
                    fill="clear"
                    onClick={() => {
                      const total = parseDecimal(amount)
                      if (total <= 0) return
                      const fromRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
                      const toRate = currencies.find((c) => c.code === toAccountCurrency)?.rateToUsd ?? 0
                      if (fromRate <= 0 || toRate <= 0) return
                      setToAmountStr(String(roundCents(total * toRate / fromRate)))
                    }}
                  >
                    <IonIcon slot="icon-only" icon={refreshOutline} />
                  </IonButton>
                </IonItem>
                <IonNote style={{ padding: '0 16px', fontSize: '0.75rem', display: 'block' }}>
                  Сумма, которая поступит на целевой счёт. Можно скорректировать вручную.
                </IonNote>
              </>
            )}

            {/* Default currency amount */}
            {needsDefaultCurrency && (
              <>
                <IonItem>
                  <IonInput
                    label={`Сумма в ${userDefaultCurrency}`}
                    labelPlacement="floating"
                    type="text"
                    inputMode="decimal"
                    value={defaultCurrencyAmountStr}
                    placeholder="0.00"
                    onIonInput={(e) => setDefaultCurrencyAmountStr(filterDecimalInput(e.detail.value ?? ''))}
                  />
                  <IonButton
                    slot="end"
                    fill="clear"
                    onClick={() => {
                      const total = parseDecimal(amount)
                      if (total <= 0) return
                      if (accountCurrency === userDefaultCurrency) {
                        setDefaultCurrencyAmountStr(String(total))
                        return
                      }
                      const acctRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
                      const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
                      if (acctRate <= 0 || defRate <= 0) return
                      setDefaultCurrencyAmountStr(String(roundCents(total * defRate / acctRate)))
                    }}
                  >
                    <IonIcon slot="icon-only" icon={refreshOutline} />
                  </IonButton>
                </IonItem>
                <IonNote style={{ padding: '0 16px', fontSize: '0.75rem', display: 'block' }}>
                  Автоматически рассчитано по текущему курсу. Можно скорректировать вручную.
                </IonNote>
              </>
            )}

            {/* Category */}
            {type !== 'transfer' && (
              <IonItem>
                <IonSelect
                  label="Категория"
                  labelPlacement="floating"
                  value={categoryId || undefined}
                  onIonChange={(e) => setCategoryId(e.detail.value ?? '')}
                  interface="action-sheet"
                >
                  {flatCategories.map((c) => (
                    <IonSelectOption key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}

            {/* Date */}
            <IonItem>
              <IonInput
                label="Дата"
                labelPlacement="floating"
                type="date"
                value={date}
                onIonInput={(e) => setDate(e.detail.value ?? todayISO())}
              />
            </IonItem>

            {/* Description */}
            <IonItem>
              <IonInput
                label="Описание"
                labelPlacement="floating"
                type="text"
                value={description}
                placeholder="Необязательно"
                onIonInput={(e) => setDescription(e.detail.value ?? '')}
              />
            </IonItem>
          </IonList>

          {/* Tags */}
          <div style={{ padding: '8px 0' }}>
            <IonLabel style={{ fontSize: '0.875rem', fontWeight: 500, paddingLeft: 16, display: 'block', marginBottom: 4 }}>
              Теги
            </IonLabel>
            <TagInput value={tags} onChange={setTags} onPendingChange={(v) => { pendingTagRef.current = v }} />
          </div>

          {/* Include in balance */}
          <IonList>
            <IonItem>
              <IonToggle
                checked={includeInBalance}
                onIonChange={(e) => setIncludeInBalance(e.detail.checked)}
              >
                Учитывать в балансе
              </IonToggle>
            </IonItem>
          </IonList>

          {/* Shares */}
          {isShared && members.length > 1 && (
            <div style={{ margin: '16px 0' }}>
              <IonList>
                <IonItem lines="none">
                  <IonLabel>Распределение долей</IonLabel>
                  <IonButton
                    slot="end"
                    fill="clear"
                    size="small"
                    onClick={() => setCustomShares((v) => !v)}
                  >
                    {customShares ? 'Авто' : 'Настроить'}
                  </IonButton>
                </IonItem>
                {members.map((m) => (
                  <IonItem key={m.userId}>
                    <IonLabel>{m.username}</IonLabel>
                    {customShares ? (
                      <IonInput
                        slot="end"
                        type="text"
                        inputMode="decimal"
                        value={shareAmounts[m.userId] ?? ''}
                        style={{ textAlign: 'right', maxWidth: 120 }}
                        onIonInput={(e) => {
                          const newVal = filterDecimalInput(e.detail.value ?? '')
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
                      />
                    ) : (
                      <IonNote slot="end">
                        {shareAmounts[m.userId] ?? '0.00'} {selectedAccount?.currency}
                      </IonNote>
                    )}
                  </IonItem>
                ))}
              </IonList>
              {customShares && !sharesValid && (
                <IonText color="danger" style={{ display: 'block', padding: '4px 16px', fontSize: '0.75rem' }}>
                  Сумма долей ({sharesSum.toFixed(2)}) должна равняться сумме транзакции ({totalAmount.toFixed(2)})
                </IonText>
              )}
            </div>
          )}

          {createMutation.error && (
            <IonText color="danger" style={{ display: 'block', padding: '8px 16px', fontSize: '0.875rem' }}>
              Ошибка. Проверьте данные и попробуйте ещё раз.
            </IonText>
          )}

          <div style={{ padding: '16px 0', display: 'flex', gap: 8 }}>
            <IonButton
              expand="block"
              fill="outline"
              style={{ flex: 1 }}
              onClick={() => history.push('/transactions')}
            >
              Отмена
            </IonButton>
            <IonButton
              expand="block"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={createMutation.isPending || !amountValid || !sharesValid}
            >
              {createMutation.isPending ? <IonSpinner name="crescent" /> : 'Создать'}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}
