import { PageHeader } from '@/components/layout/PageHeader'
import { EntityFormHeader, EntityFormSection, EntityFormSelect, EntityFormError } from '@/components/EntityForm'
import { AppContent } from '@/components/layout/AppContent'
import { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonInput,
  IonSelectOption,
  IonToggle,
  IonButton,
  IonSpinner,
  IonText,
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
  personOutline,
} from 'ionicons/icons'
import {
  accountsApi,
  type CreateAccountDto,
  type Account,
  type AccountAccessMode,
  type AccountKind,
} from '@/api/accounts'
import { currenciesApi } from '@/api/currencies'
import { useAuthStore } from '@/store/authStore'
import {
  filterSignedDecimalInput,
  isValidDecimal,
  parseDecimal,
  toggleDecimalSign,
} from '@/lib/decimal'
import { ACCOUNT_CONFIGURATION_NOTE, buildAccountMembers, type MemberDraft } from '@/lib/accountMembers'
import { AccountMembersFields } from '@/components/AccountMembersFields'
import { accountKindShortLabel } from '@/lib/accountKind'
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
import { AccountKindField } from '@/components/AccountKindField'

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

export function AccountFormModal({
  isOpen,
  onClose,
  initial,
  defaultCurrency,
  onSubmit,
  loading,
  isEditing = false,
  canChangeTransferAcceptance = false,
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
  canChangeTransferAcceptance?: boolean
  onManageMembers?: () => void
  onDelete?: () => void
  error?: string
  title: string
}) {
  const owner = useAuthStore((state) => state.user)
  const [members, setMembers] = useState<MemberDraft[]>(owner ? [{ username: owner.username, share: '1' }] : [])
  const memberResult = buildAccountMembers(members, owner?.username ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const initialName = initial?.name ?? ''
  const initialAccessMode = initial?.accessMode ?? 'personal'
  const initialKind = initial?.kind ?? 'spending'
  const initialCurrency = initial?.currency ?? defaultCurrency
  const initialIcon = normalizeAccountIconValue(initial?.icon)
  const initialBalanceValue = initialBalanceInputValue(initial?.initialBalance)
  const initialBalanceDateValue = initial?.initialBalanceDate
    ? initial.initialBalanceDate.slice(0, 10)
    : today

  const [acceptTransfers, setAcceptTransfers] = useState(initial?.acceptTransfers ?? false)
  const [name, setName] = useState(initialName)
  const [accessMode, setAccessMode] = useState<AccountAccessMode>(initialAccessMode)
  const [kind, setKind] = useState<AccountKind>(initialKind)
  const [currency, setCurrency] = useState(initialCurrency)
  const [icon, setIcon] = useState(initialIcon)
  const [initialBalance, setInitialBalance] = useState(initialBalanceValue)
  const [initialBalanceDate, setInitialBalanceDate] = useState(initialBalanceDateValue)
  const initialBalanceInputRef = useRef<HTMLIonInputElement>(null)

  const initialFormState: AccountFormState = {
    acceptTransfers: initial?.acceptTransfers ?? false,
    name: initialName,
    accessMode: initialAccessMode,
    kind: initialKind,
    currency: initialCurrency,
    icon: initialIcon,
    initialBalance: initialBalanceValue,
    initialBalanceDate: initialBalanceDateValue,
  }
  const isDirty = hasAccountFormChanges(initialFormState, {
    acceptTransfers,
    name,
    accessMode,
    kind,
    currency,
    icon,
    initialBalance,
    initialBalanceDate,
  })

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies', currency],
    queryFn: () => currenciesApi.list([currency]),
    staleTime: 60_000,
  })

  const handleSubmit = () => {
    if (!isEditing && accessMode === 'shared' && memberResult.error) return
    onSubmit({
      ...(!isEditing || canChangeTransferAcceptance ? { acceptTransfers: accessMode === 'personal' && acceptTransfers } : {}),
      ...(!isEditing && accessMode === 'shared' ? { members: memberResult.members } : {}),
      name,
      accessMode,
      kind,
      currency,
      icon: normalizeAccountIconValue(icon),
      initialBalance: parseDecimal(initialBalance),
      initialBalanceDate,
    })
  }

  const resetForm = () => {
    setMembers(owner ? [{ username: owner.username, share: '1' }] : [])
    setAcceptTransfers(initial?.acceptTransfers ?? false)
    setName(initialName)
    setAccessMode(initialAccessMode)
    setKind(initialKind)
    setCurrency(initialCurrency)
    setIcon(initialIcon)
    setInitialBalance(initialBalanceValue)
    setInitialBalanceDate(initialBalanceDateValue)
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} onWillPresent={resetForm}>
      <EntityFormHeader title={title} onCancel={onClose} onSubmit={handleSubmit}
        pending={loading} disabled={!name.trim() || !isValidDecimal(initialBalance) || (isEditing && !isDirty) || (!isEditing && accessMode === 'shared' && !!memberResult.error)} />
      <AppContent>
        <EntityFormSection title="Основное">

          <IonItem>
            <IonInput
              label="Название"
              labelPlacement="stacked"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
              placeholder="Например: Карта Сбер"
              required
            />
          </IonItem>

          {accessMode === 'personal' && (!isEditing || canChangeTransferAcceptance) && <>
            <IonItem><IonToggle checked={acceptTransfers} onIonChange={(e) => setAcceptTransfers(e.detail.checked)}>
              Принимать переводы от других пользователей
            </IonToggle></IonItem>
            <IonNote className="entity-form-note">По точному логину владельца будут видны название, иконка и валюта счёта. Баланс останется закрытым.</IonNote>
          </>}
          <AccountIconSettings
            value={icon}
            onChange={setIcon}
            sessionKey={isOpen ? 'open' : 'closed'}
          />

          <AccountKindField

            value={kind}
            onChange={isEditing ? undefined : setKind}
          />

          {!isEditing && (
            <IonItem>
              <IonToggle
                checked={accessMode === 'shared'}
                onIonChange={(event) => setAccessMode(
                  event.detail.checked ? 'shared' : 'personal',
                )}
              >
                Совместный счёт
              </IonToggle>
            </IonItem>
          )}
          {isEditing && (
            <IonItem>
              <IonLabel>Совместный счёт</IonLabel>
              <IonNote slot="end" className="account-form-readonly-value">
                {accessMode === 'shared' ? 'Да' : 'Нет'}
              </IonNote>
            </IonItem>
          )}

          <IonNote className="entity-form-note">{ACCOUNT_CONFIGURATION_NOTE}</IonNote>
          {!isEditing && accessMode === 'shared' && <AccountMembersFields
            value={members} onChange={setMembers} ownerUsername={owner?.username ?? ''}
            error={memberResult.error}
          />}

          {!isEditing && (
            <IonItem>
              <EntityFormSelect
                label="Валюта"
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
              </EntityFormSelect>
            </IonItem>
          )}
          {isEditing && (
            <IonItem>
              <IonLabel>Валюта</IonLabel>
              <IonNote slot="end" className="account-form-readonly-value">{currency}</IonNote>
            </IonItem>
          )}

          {isEditing && initial?.accessMode === 'shared' && onManageMembers && (
            <IonItem
              button
              detail

              onClick={onManageMembers}
            >
              <IonIcon icon={peopleOutline} slot="start" color="medium" />
              <IonLabel>Участники и доли</IonLabel>
            </IonItem>
          )}
        </EntityFormSection>

        <EntityFormSection title="Баланс">

          <IonItem>
            <IonInput
              ref={initialBalanceInputRef}
              label="Стартовый баланс"
              labelPlacement="stacked"
              type="text"
              inputMode="decimal"
              value={initialBalance}
              onIonInput={(e) => setInitialBalance(
                filterSignedDecimalInput(e.detail.value ?? ''),
              )}
              placeholder="0"
            >
              <IonButton
                slot="start"
                type="button"
                fill="clear"
                className="account-form-sign-button"
                aria-label="Изменить знак стартового баланса"
                onClick={() => {
                  setInitialBalance((value) => toggleDecimalSign(value))
                  requestAnimationFrame(() => initialBalanceInputRef.current?.setFocus())
                }}
              >
                <span aria-hidden="true">±</span>
              </IonButton>
              <IonNote slot="end" className="account-form-input-suffix">{currency}</IonNote>
            </IonInput>
          </IonItem>

          <IonItem>
            <IonInput
              label="Дата стартового баланса"
              labelPlacement="stacked"
              type="date"
              value={initialBalanceDate}
              onIonInput={(e) => setInitialBalanceDate(e.detail.value ?? '')}
            />
          </IonItem>

        </EntityFormSection>

        <EntityFormError>{error}</EntityFormError>

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
      </AppContent>
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
        ...(dto.acceptTransfers !== undefined ? { acceptTransfers: dto.acceptTransfers } : {}),
        icon: dto.icon,
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
      <PageHeader title="Счета" backHref="/dashboard" />
      <AppContent withFab
        fixed={
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => { setShowCreateModal(true); setEditingAccount(null) }}>
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        }
      >
        {isLoading ? (
          <div className="app-state">
            <IonSpinner />
          </div>
        ) : accounts.length === 0 ? (
          <div className="app-state">
            <IonIcon icon={walletOutline} />
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
                    className="account-list-item"
                    button
                    onClick={() => openEditor(account)}
                    detail={false}
                  >
                    <span slot="start">
                      <AccountIcon value={account.icon ?? DEFAULT_ACCOUNT_ICON} />
                    </span>
                    <IonLabel className="account-list-label">
                      <h2 title={account.name}>{account.name}</h2>
                      <div className="account-list-meta">
                        <span className="account-list-currency">
                          <span
                            className="account-list-access"
                            role="img"
                            aria-label={account.accessMode === 'shared' ? 'Совместный счёт' : 'Личный счёт'}
                            title={account.accessMode === 'shared' ? 'Совместный счёт' : 'Личный счёт'}
                          >
                            <IonIcon aria-hidden="true" icon={account.accessMode === 'shared' ? peopleOutline : personOutline} />
                          </span>
                          <span>{account.currency}</span>
                        </span>
                        {account.kind !== 'spending' && (
                          <span className="account-list-kind">{accountKindShortLabel(account.kind)}</span>
                        )}
                      </div>
                    </IonLabel>
                    {account.balance && (
                      <IonNote slot="end" className="account-list-balance">
                        <div style={{ textAlign: 'right' }}>
                          {fmtCurrency(account.balance.native, account.currency)}
                          {account.balance.displayCurrency !== account.currency && (
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                              ≈ {fmtCurrency(account.balance.display, account.balance.displayCurrency)}
                            </div>
                          )}
                          {account.accessMode === 'shared' && (
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                              Всего: {fmtCurrency(account.balance.totalNative, account.currency)}
                            </div>
                          )}
                        </div>
                      </IonNote>
                    )}
                  </IonItem>
                  <IonItemOptions side="end">
                    {account.accessMode === 'shared' && (
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
            canChangeTransferAcceptance={editingAccount.ownerId === user?.id}
            onManageMembers={editingAccount.accessMode === 'shared' ? () => {
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
          cssClass="account-delete-alert"
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
      </AppContent>
    </IonPage>
  )
}
