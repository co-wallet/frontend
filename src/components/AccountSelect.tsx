import { EntityFormPicker } from './EntityForm'
import { EntitySelectModal } from './EntitySelectModal'
import { useState } from 'react'
import {
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react'
import { checkmarkCircle } from 'ionicons/icons'

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
  accounts: (Pick<Account, 'id' | 'name' | 'icon' | 'currency'> & Partial<Pick<Account, 'accessMode'>>)[]
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
      <EntityFormPicker label={label}
        value={selectedAccount ? `${selectedAccount.name} · ${selectedAccount.currency}` : 'Выберите счёт'}
        accessibleValue={selectedAccount?.name ?? 'не выбран'}
        icon={selectedAccount && <AccountIcon value={selectedAccount.icon} size={24} />}
        isOpen={isOpen} onOpen={() => setIsOpen(true)} />

      <EntitySelectModal
        title={label}
        isOpen={isOpen}
        onDismiss={() => setIsOpen(false)}
      >
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
                      {account.accessMode ? `${account.accessMode === 'shared' ? 'Совместный' : 'Личный'} · ` : ''}{account.currency}
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
      </EntitySelectModal>
    </>
  )
}
