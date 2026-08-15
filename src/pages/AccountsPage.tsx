import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
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
  IonToggle,
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
  createOutline,
  trashOutline,
  peopleOutline,
} from 'ionicons/icons'
import { accountsApi, type CreateAccountDto, type Account } from '@/api/accounts'
import { currenciesApi } from '@/api/currencies'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput } from '@/lib/decimal'

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

function AccountFormModal({
  isOpen,
  onClose,
  initial,
  defaultCurrency,
  onSubmit,
  loading,
  isEditing = false,
  title,
}: {
  isOpen: boolean
  onClose: () => void
  initial?: Partial<CreateAccountDto>
  defaultCurrency: string
  onSubmit: (dto: CreateAccountDto) => void
  loading: boolean
  isEditing?: boolean
  title: string
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
    queryKey: ['currencies', currency],
    queryFn: () => currenciesApi.list([currency]),
    staleTime: 60_000,
  })

  const handleSubmit = () => {
    onSubmit({
      name,
      type,
      currency,
      icon,
      includeInBalance,
      initialBalance: parseDecimal(initialBalance),
      initialBalanceDate,
    })
  }

  const resetForm = () => {
    setName(initial?.name ?? '')
    setType(initial?.type ?? 'personal')
    setCurrency(initial?.currency ?? defaultCurrency)
    setIcon(initial?.icon ?? '💳')
    setIncludeInBalance(initial?.includeInBalance ?? true)
    setInitialBalance(initial?.initialBalance ? String(initial.initialBalance) : '')
    setInitialBalanceDate(
      initial?.initialBalanceDate
        ? initial.initialBalanceDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    )
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
            <IonButton strong onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? <IonSpinner name="dots" /> : 'Сохранить'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonInput
              label="Название"
              labelPlacement="floating"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
              placeholder="Например: Карта Сбер"
              required
            />
          </IonItem>

          <IonItem>
            <IonLabel>Иконка</IonLabel>
            <div slot="end" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px 0' }}>
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  style={{
                    width: '36px',
                    height: '36px',
                    fontSize: '18px',
                    border: icon === i ? '2px solid var(--ion-color-primary)' : '1px solid var(--ion-border-color, #ccc)',
                    borderRadius: '8px',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </IonItem>

          {!isEditing && (
            <IonItem>
              <IonSelect
                label="Тип"
                labelPlacement="floating"
                value={type}
                onIonChange={(e) => setType(e.detail.value)}
              >
                <IonSelectOption value="personal">Личный</IonSelectOption>
                <IonSelectOption value="shared">Совместный</IonSelectOption>
              </IonSelect>
            </IonItem>
          )}
          {isEditing && (
            <IonItem>
              <IonLabel>Тип</IonLabel>
              <IonNote slot="end">{type === 'personal' ? 'Личный' : 'Совместный'}</IonNote>
            </IonItem>
          )}

          {!isEditing && (
            <IonItem>
              <IonSelect
                label="Валюта"
                labelPlacement="floating"
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
            <IonItem>
              <IonLabel>Валюта</IonLabel>
              <IonNote slot="end">{currency}</IonNote>
            </IonItem>
          )}

          <IonItem>
            <IonInput
              label="Начальный баланс"
              labelPlacement="floating"
              type="text"
              inputMode="decimal"
              value={initialBalance}
              onIonInput={(e) => setInitialBalance(filterDecimalInput(e.detail.value ?? ''))}
              placeholder="0"
            />
          </IonItem>

          <IonItem>
            <IonInput
              label="Дата баланса"
              labelPlacement="floating"
              type="date"
              value={initialBalanceDate}
              onIonInput={(e) => setInitialBalanceDate(e.detail.value ?? '')}
            />
          </IonItem>

          <IonItem>
            <IonToggle
              checked={includeInBalance}
              onIonChange={(e) => setIncludeInBalance(e.detail.checked)}
            >
              Учитывать в общем балансе
            </IonToggle>
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  )
}

export function AccountsPage() {
  const qc = useQueryClient()
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
                    routerLink={`/accounts/${account.id}`}
                    detail={false}
                  >
                    <span slot="start" style={{ fontSize: '24px' }}>
                      {account.icon ?? '💳'}
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
                    <IonItemOption
                      color="primary"
                      onClick={() => setEditingAccount(account)}
                    >
                      <IonIcon slot="icon-only" icon={createOutline} />
                    </IonItemOption>
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
