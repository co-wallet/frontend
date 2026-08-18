import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonButtons,
  IonSpinner,
  IonText,
  IonMenuButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAlert,
} from '@ionic/react'
import {
  addOutline,
  walletOutline,
  trashOutline,
  peopleOutline,
} from 'ionicons/icons'
import { accountsApi, type CreateAccountDto, type Account } from '@/api/accounts'
import { currenciesApi } from '@/api/currencies'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput } from '@/lib/decimal'
import { shouldShowPersonalTypeWarning } from '@/lib/accountType'
import {
  hasAccountFormChanges,
  initialBalanceInputValue,
  type AccountFormState,
} from '@/lib/accountForm'
import {
  AccountIcon,
  DEFAULT_ACCOUNT_ICON,
  normalizeAccountIconValue,
} from '@/components/AccountIcon'
import { AccountIconSettings } from '@/components/AccountIconSettings'
import { BalanceInclusionToggle } from '@/components/BalanceInclusionToggle'

import './AccountsPage.css'

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

function AccountFormModal({
  isOpen,
  onClose,
  initial,
  defaultCurrency,
  onSubmit,
  loading,
  isEditing = false,
  canChangeType = false,
  onManageMembers,
  onDelete,
  error,
  title,
}: {
  isOpen: boolean
  onClose: () => void
  initial?: Partial<CreateAccountDto>
  defaultCurrency: string
  onSubmit: (dto: CreateAccountDto) => void
  loading: boolean
  isEditing?: boolean
  canChangeType?: boolean
  onManageMembers?: () => void
  onDelete?: () => void
  error?: string
  title: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const initialName = initial?.name ?? ''
  const initialType = initial?.type ?? 'personal'
  const initialCurrency = initial?.currency ?? defaultCurrency
  const initialIcon = normalizeAccountIconValue(initial?.icon)
  const initialIncludeInBalance = initial?.includeInBalance ?? true
  const initialBalanceValue = initialBalanceInputValue(initial?.initialBalance)
  const initialBalanceDateValue = initial?.initialBalanceDate
    ? initial.initialBalanceDate.slice(0, 10)
    : today

  const [name, setName] = useState(initialName)
  const [type, setType] = useState<'personal' | 'shared'>(initialType)
  const [currency, setCurrency] = useState(initialCurrency)
  const [icon, setIcon] = useState(initialIcon)
  const [includeInBalance, setIncludeInBalance] = useState(initialIncludeInBalance)
  const [initialBalance, setInitialBalance] = useState(initialBalanceValue)
  const [initialBalanceDate, setInitialBalanceDate] = useState(initialBalanceDateValue)

  const initialFormState: AccountFormState = {
    name: initialName,
    type: initialType,
    currency: initialCurrency,
    icon: initialIcon,
    includeInBalance: initialIncludeInBalance,
    initialBalance: initialBalanceValue,
    initialBalanceDate: initialBalanceDateValue,
  }
  const isDirty = hasAccountFormChanges(initialFormState, {
    name,
    type,
    currency,
    icon,
    includeInBalance,
    initialBalance,
    initialBalanceDate,
  })

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies', currency],
    queryFn: () => currenciesApi.list([currency]),
    staleTime: 60_000,
  })

  const handleSubmit = () => {
    onSubmit({
      name,
      type,
      currency,
      icon: normalizeAccountIconValue(icon),
      includeInBalance,
      initialBalance: parseDecimal(initialBalance),
      initialBalanceDate,
    })
  }

  const resetForm = () => {
    setName(initialName)
    setType(initialType)
    setCurrency(initialCurrency)
    setIcon(initialIcon)
    setIncludeInBalance(initialIncludeInBalance)
    setInitialBalance(initialBalanceValue)
    setInitialBalanceDate(initialBalanceDateValue)
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} onWillPresent={resetForm}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Отмена</IonButton>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              onClick={handleSubmit}
              disabled={loading || !name.trim() || (isEditing && !isDirty)}
            >
              {loading ? <IonSpinner name="dots" /> : 'Сохранить'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding account-form-content">
        <IonList className="account-form-section">
          <IonListHeader className="account-form-section__header">
            <IonLabel>Основное</IonLabel>
          </IonListHeader>

          <IonItem className="account-form-row account-form-row--stacked">
            <IonInput
              label="Название"
              labelPlacement="floating"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
              placeholder="Например: Карта Сбер"
              required
            />
          </IonItem>

          <AccountIconSettings
            value={icon}
            onChange={setIcon}
            sessionKey={isOpen ? 'open' : 'closed'}
          />

          {(!isEditing || canChangeType) && (
            <IonItem className="account-form-row account-form-row--compact">
              <IonSelect
                label="Тип"
                labelPlacement="fixed"
                value={type}
                onIonChange={(e) => setType(e.detail.value)}
              >
                <IonSelectOption value="personal">Личный</IonSelectOption>
                <IonSelectOption value="shared">Совместный</IonSelectOption>
              </IonSelect>
            </IonItem>
          )}
          {isEditing && !canChangeType && (
            <IonItem className="account-form-row account-form-row--compact">
              <IonLabel>Тип</IonLabel>
              <IonNote slot="end" className="account-form-readonly-value">
                {type === 'personal' ? 'Личный' : 'Совместный'}
              </IonNote>
            </IonItem>
          )}

          {isEditing && canChangeType && shouldShowPersonalTypeWarning(initial?.type, type) && (
            <IonNote className="account-form-type-warning">
              Совместный счёт можно сделать личным только без других участников и транзакций.
            </IonNote>
          )}

          {!isEditing && (
            <IonItem className="account-form-row account-form-row--compact">
              <IonSelect
                label="Валюта"
                labelPlacement="fixed"
                value={currency}
                onIonChange={(e) => setCurrency(e.detail.value)}
              >
                {currencies.length > 0
                  ? currencies.map((c) => (
                      <IonSelectOption key={c.code} value={c.code}>
                        {c.code} — {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                      </IonSelectOption>
                    ))
                  : ['RUB', 'USD', 'EUR', 'GBP', 'CNY'].map((c) => (
                      <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
                    ))}
              </IonSelect>
            </IonItem>
          )}
          {isEditing && (
            <IonItem className="account-form-row account-form-row--compact">
              <IonLabel>Валюта</IonLabel>
              <IonNote slot="end" className="account-form-readonly-value">{currency}</IonNote>
            </IonItem>
          )}

          {isEditing && initial?.type === 'shared' && onManageMembers && (
            <IonItem
              button
              detail
              className="account-form-row account-form-row--compact"
              onClick={onManageMembers}
            >
              <IonIcon icon={peopleOutline} slot="start" color="medium" />
              <IonLabel>Участники и доли</IonLabel>
            </IonItem>
          )}
        </IonList>

        <IonList className="account-form-section">
          <IonListHeader className="account-form-section__header">
            <IonLabel>Баланс</IonLabel>
          </IonListHeader>

          <IonItem className="account-form-row account-form-row--stacked">
            <IonInput
              label="Стартовый баланс"
              labelPlacement="floating"
              type="text"
              inputMode="decimal"
              value={initialBalance}
              onIonInput={(e) => setInitialBalance(filterDecimalInput(e.detail.value ?? ''))}
              placeholder="0"
            >
              <IonNote slot="end" className="account-form-input-suffix">{currency}</IonNote>
            </IonInput>
          </IonItem>

          <IonItem className="account-form-row account-form-row--stacked">
            <IonInput
              className="account-form-date-input"
              label="Дата стартового баланса"
              labelPlacement="stacked"
              type="date"
              value={initialBalanceDate}
              onIonInput={(e) => setInitialBalanceDate(e.detail.value ?? '')}
            />
          </IonItem>

          <BalanceInclusionToggle
            className="account-form-row account-form-row--compact"
            checked={includeInBalance}
            onChange={setIncludeInBalance}
          />
        </IonList>

        {error && (
          <IonText color="danger">
            <p className="account-form-error">{error}</p>
          </IonText>
        )}

        {isEditing && onDelete && (
          <IonButton
            expand="block"
            fill="clear"
            color="danger"
            className="account-form-delete"
            onClick={onDelete}
          >
            <IonIcon icon={trashOutline} slot="start" />
            Удалить счёт
          </IonButton>
        )}
      </IonContent>
    </IonModal>
  )
}

export function AccountsPage() {
  const qc = useQueryClient()
  const history = useHistory()
  const user = useAuthStore((s) => s.user)
  const defaultCurrency = user?.defaultCurrency ?? 'USD'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', defaultCurrency],
    queryFn: () => accountsApi.list(defaultCurrency),
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setShowCreateModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateAccountDto }) =>
      accountsApi.update(id, {
        name: dto.name,
        type: dto.type,
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

  const updateError = updateMutation.error
    ? axios.isAxiosError<{ error?: string }>(updateMutation.error) && updateMutation.error.response?.status === 409
      ? 'Совместный счёт можно сделать личным только без других участников и транзакций.'
      : 'Не удалось сохранить счёт. Проверьте данные и попробуйте ещё раз.'
    : undefined

  const openEditor = (account: Account) => {
    updateMutation.reset()
    setEditingAccount(account)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Счета</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <IonSpinner />
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <IonIcon icon={walletOutline} style={{ fontSize: '48px', opacity: 0.3 }} />
            <IonText>
              <p>Нет счетов. Создайте первый!</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {accounts.map((account) => {
              const isOwner = account.ownerId === user?.id
              return (
                <IonItemSliding key={account.id}>
                  <IonItem
                    button
                    onClick={() => openEditor(account)}
                    detail={false}
                  >
                    <span slot="start">
                      <AccountIcon value={account.icon ?? DEFAULT_ACCOUNT_ICON} />
                    </span>
                    <IonLabel>
                      <h2>{account.name}</h2>
                      <p>
                        {account.type === 'shared' ? 'Совместный' : 'Личный'} · {account.currency}
                        {!account.includeInBalance && ' · Не в балансе'}
                      </p>
                    </IonLabel>
                    {account.balance && (
                      <IonNote slot="end" style={{ fontSize: '14px', fontWeight: 500 }}>
                        <div style={{ textAlign: 'right' }}>
                          {fmtCurrency(account.balance.native, account.currency)}
                          {account.balance.displayCurrency !== account.currency && (
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                              ≈ {fmtCurrency(account.balance.display, account.balance.displayCurrency)}
                            </div>
                          )}
                          {account.type === 'shared' && (
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                              Всего: {fmtCurrency(account.balance.totalNative, account.currency)}
                            </div>
                          )}
                        </div>
                      </IonNote>
                    )}
                  </IonItem>
                  <IonItemOptions side="end">
                    {account.type === 'shared' && (
                      <IonItemOption
                        color="tertiary"
                        routerLink={`/accounts/${account.id}/members`}
                      >
                        <IonIcon slot="icon-only" icon={peopleOutline} />
                      </IonItemOption>
                    )}
                    {isOwner && (
                      <IonItemOption
                        color="danger"
                        onClick={() => setDeleteAccountId(account.id)}
                      >
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonItemOption>
                    )}
                  </IonItemOptions>
                </IonItemSliding>
              )
            })}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setShowCreateModal(true); setEditingAccount(null) }}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <AccountFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          defaultCurrency={defaultCurrency}
          onSubmit={(dto) => createMutation.mutate(dto)}
          loading={createMutation.isPending}
          title="Новый счёт"
        />

        {editingAccount && (
          <AccountFormModal
            isOpen={!!editingAccount}
            onClose={() => setEditingAccount(null)}
            initial={{ ...editingAccount, icon: editingAccount.icon ?? undefined }}
            defaultCurrency={defaultCurrency}
            onSubmit={(dto) => updateMutation.mutate({ id: editingAccount.id, dto })}
            loading={updateMutation.isPending}
            isEditing
            canChangeType={editingAccount.ownerId === user?.id}
            onManageMembers={editingAccount.type === 'shared' ? () => {
              setEditingAccount(null)
              history.push(`/accounts/${editingAccount.id}/members`)
            } : undefined}
            onDelete={editingAccount.ownerId === user?.id ? () => {
              setEditingAccount(null)
              setDeleteAccountId(editingAccount.id)
            } : undefined}
            error={updateError}
            title="Редактировать счёт"
          />
        )}

        <IonAlert
          isOpen={!!deleteAccountId}
          header="Удалить счёт?"
          message="Это действие нельзя отменить. Все транзакции по этому счёту будут удалены."
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: 'Удалить',
              role: 'destructive',
              handler: () => {
                if (deleteAccountId) deleteMutation.mutate(deleteAccountId)
              },
            },
          ]}
          onDidDismiss={() => setDeleteAccountId(null)}
        />
      </IonContent>
    </IonPage>
  )
}
