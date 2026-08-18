import { useState, useEffect, useRef } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonButton, IonList, IonItem, IonInput, IonSelect,
  IonSelectOption, IonToggle, IonSpinner, IonText, IonNote, IonLabel,
  IonIcon, IonAlert,
} from '@ionic/react'
import { refreshOutline } from 'ionicons/icons'
import { transactionsApi, type UpdateTransactionDto } from '@/api/transactions'
import { accountsApi, type AccountMember } from '@/api/accounts'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { currenciesApi } from '@/api/currencies'
import { TagInput } from '@/components/TagInput'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput, isValidDecimal } from '@/lib/decimal'

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
  const history = useHistory()
  const qc = useQueryClient()
  const userDefaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'USD')

  const [amount, setAmount] = useState('')
  const [defaultCurrencyAmountStr, setDefaultCurrencyAmountStr] = useState('')
  const [toAmountStr, setToAmountStr] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [includeInBalance, setIncludeInBalance] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const pendingTagRef = useRef('')
  const [customShares, setCustomShares] = useState(false)
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

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
  const isShared = selectedAccount?.accessMode === 'shared'

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

  useEffect(() => {
    if (!tx || initialized) return
    setAmount(String(tx.amount))
    setCategoryId(tx.categoryId ?? '')
    setDescription(tx.description ?? '')
    setDate(tx.date.slice(0, 10))
    setIncludeInBalance(tx.includeInBalance)
    setTags(tx.tags?.map((t) => t.name) ?? [])
    if (tx.toAmount != null) {
      setToAmountStr(String(tx.toAmount))
    }
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
  const toAccount = accounts.find((a) => a.id === tx?.toAccountId)
  const toAccountCurrency = toAccount?.currency ?? ''
  const isCrossCurrencyTransfer = tx?.type === 'transfer' && !!toAccountCurrency && toAccountCurrency !== accountCurrency
  const needsDefaultCurrency = (!!accountCurrency && accountCurrency !== userDefaultCurrency) || isCrossCurrencyTransfer

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateTransactionDto) => transactionsApi.update(txID!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      history.goBack()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => transactionsApi.delete(txID!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      history.goBack()
    },
  })

  function handleSubmit() {
    if (!amountValid || !sharesValid) return

    const pendingTrimmed = pendingTagRef.current.trim().toLowerCase()
    const allTags = pendingTrimmed && !tags.includes(pendingTrimmed)
      ? [...tags, pendingTrimmed]
      : tags

    const dcaValue = parseDecimal(defaultCurrencyAmountStr)
    const toAmountValue = parseDecimal(toAmountStr)
    const dto: UpdateTransactionDto = {
      amount: totalAmount,
      ...(isCrossCurrencyTransfer ? { toAmount: toAmountValue > 0 ? toAmountValue : null } : {}),
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

  function renderCurrencyRate() {
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
    if (accountCurrency === userDefaultCurrency) return null
    const acctRate = currencies.find((c) => c.code === accountCurrency)?.rateToUsd ?? 0
    const defRate = currencies.find((c) => c.code === userDefaultCurrency)?.rateToUsd ?? 0
    if (acctRate <= 0 || defRate <= 0) return null
    const rate = acctRate / defRate
    return (
      <IonNote style={{ fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
        {rate >= 1
          ? `1 ${userDefaultCurrency} = ${rate.toFixed(4)} ${accountCurrency}`
          : `1 ${accountCurrency} = ${(1 / rate).toFixed(4)} ${userDefaultCurrency}`}
      </IonNote>
    )
  }

  if (txLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/transactions" text="Назад" />
            </IonButtons>
            <IonTitle>Редактирование</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    )
  }

  if (!tx) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/transactions" text="Назад" />
            </IonButtons>
            <IonTitle>Редактирование</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <IonText color="medium">Транзакция не найдена</IonText>
          </div>
        </IonContent>
      </IonPage>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/transactions" text="Назад" />
          </IonButtons>
          <IonTitle>Редактирование</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="ion-padding">
          <IonList>
            {/* Amount */}
            <IonItem>
              <IonInput
                label={`Сумма (${selectedAccount?.currency ?? tx.currency})`}
                labelPlacement="floating"
                type="text"
                inputMode="decimal"
                value={amount}
                placeholder="0.00"
                onIonInput={(e) => setAmount(filterDecimalInput(e.detail.value ?? ''))}
              />
            </IonItem>
            {renderCurrencyRate()}

            {/* To-amount for cross-currency transfers */}
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
                  Сумма в валюте пользователя. Можно пересчитать по текущему курсу.
                </IonNote>
              </>
            )}

            {/* Category (not for transfer) */}
            {tx.type !== 'transfer' && (
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
                      {c.name}
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
                onIonInput={(e) => setDate(e.detail.value ?? '')}
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
                        {shareAmounts[m.userId] ?? '0.00'} {tx.currency}
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

          {updateMutation.error && (
            <IonText color="danger" style={{ display: 'block', padding: '8px 16px', fontSize: '0.875rem' }}>
              Ошибка. Проверьте данные и попробуйте ещё раз.
            </IonText>
          )}

          <div style={{ padding: '16px 0', display: 'flex', gap: 8 }}>
            <IonButton
              expand="block"
              fill="outline"
              style={{ flex: 1 }}
              onClick={() => history.goBack()}
            >
              Отмена
            </IonButton>
            <IonButton
              expand="block"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !amountValid || !sharesValid}
            >
              {updateMutation.isPending ? <IonSpinner name="crescent" /> : 'Сохранить'}
            </IonButton>
          </div>

          <IonButton
            expand="block"
            color="danger"
            fill="outline"
            style={{ marginBottom: 16 }}
            onClick={() => setShowDeleteAlert(true)}
          >
            Удалить транзакцию
          </IonButton>

          <IonAlert
            isOpen={showDeleteAlert}
            onDidDismiss={() => setShowDeleteAlert(false)}
            header="Удалить транзакцию?"
            message="Это действие нельзя отменить."
            buttons={[
              { text: 'Отмена', role: 'cancel' },
              { text: 'Удалить', role: 'destructive', handler: () => deleteMutation.mutate() },
            ]}
          />
        </div>
      </IonContent>
    </IonPage>
  )
}
