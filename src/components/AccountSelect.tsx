import { useState } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { checkmarkCircle, chevronExpandOutline } from 'ionicons/icons'

import type { Account } from '@/api/accounts'
import { AccountIcon } from '@/components/AccountIcon'

import './AccountSelect.css'

export function AccountSelect({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string
  accounts: Account[]
  value: string
  onChange: (accountId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedAccount = accounts.find((account) => account.id === value)

  const selectAccount = (accountId: string) => {
    onChange(accountId)
    setIsOpen(false)
  }

  return (
    <>
      <IonItem
        key={selectedAccount?.id ?? 'empty'}
        className="account-select-trigger"
        button
        detail={false}
        aria-label={`${label}: ${selectedAccount?.name ?? 'не выбран'}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        {selectedAccount && (
          <span slot="start" className="account-select-icon">
            <AccountIcon value={selectedAccount.icon} size={38} />
          </span>
        )}
        <IonLabel className="account-select-trigger__label">
          <p>{label}</p>
          <h2>
            {selectedAccount
              ? `${selectedAccount.name} · ${selectedAccount.currency}`
              : 'Выберите счёт'}
          </h2>
        </IonLabel>
        <IonIcon slot="end" icon={chevronExpandOutline} color="medium" aria-hidden="true" />
      </IonItem>

      <IonModal
        className="account-select-modal"
        isOpen={isOpen}
        initialBreakpoint={0.5}
        breakpoints={[0, 0.5, 0.85]}
        handleBehavior="cycle"
        onDidDismiss={() => setIsOpen(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{label}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)}>Закрыть</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {accounts.length === 0 ? (
            <p className="account-select-modal__empty">Нет доступных счетов</p>
          ) : (
            <IonList inset className="account-select-modal__list">
              {accounts.map((account) => {
                const selected = account.id === value
                return (
                  <IonItem
                    button
                    detail={false}
                    key={account.id}
                    className="account-select-option"
                    aria-label={`${account.name}, ${account.currency}`}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => selectAccount(account.id)}
                  >
                    <span slot="start" className="account-select-icon">
                      <AccountIcon value={account.icon} size={42} />
                    </span>
                    <IonLabel>
                      <h2>{account.name}</h2>
                      <p>
                        {account.type === 'shared' ? 'Совместный' : 'Личный'} · {account.currency}
                      </p>
                    </IonLabel>
                    {selected && (
                      <IonIcon
                        slot="end"
                        icon={checkmarkCircle}
                        color="primary"
                        aria-label="Выбран"
                      />
                    )}
                  </IonItem>
                )
              })}
            </IonList>
          )}
        </IonContent>
      </IonModal>
    </>
  )
}
