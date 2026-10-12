import { EntityFormPicker } from './EntityForm'
import { EntitySelectModal } from './EntitySelectModal'
import { Fragment, useState } from 'react'
import {
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonSearchbar,
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
  accounts: (Pick<Account, 'id' | 'name' | 'icon' | 'currency'> & Partial<Pick<Account, 'accessMode'>> & { ownerUsername?: string })[]
  value: string
  onChange: (accountId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase('ru')
  const filteredAccounts = accounts.filter((account) => account.name.toLocaleLowerCase('ru').includes(query))
  const hasForeignAccounts = accounts.some((account) => !!account.ownerUsername)
  const groups = [
    { key: 'own', title: hasForeignAccounts ? 'Мои счета' : null, accounts: filteredAccounts.filter((account) => !account.ownerUsername) },
    { key: 'foreign', title: 'Чужие счета', accounts: filteredAccounts.filter((account) => !!account.ownerUsername) },
  ].filter((group) => group.accounts.length > 0)
  const selectedAccount = accounts.find((account) => account.id === value)
  const selectedName = selectedAccount && `${selectedAccount.name}${selectedAccount.ownerUsername ? ` · @${selectedAccount.ownerUsername}` : ''}`

  const selectAccount = (accountId: string) => {
    onChange(accountId)
    setIsOpen(false)
  }

  return (
    <>
      <EntityFormPicker label={label}
        value={selectedAccount ? `${selectedAccount.name} · ${selectedAccount.currency}` : 'Выберите счёт'}
        secondaryValue={selectedAccount?.ownerUsername ? `@${selectedAccount.ownerUsername}` : undefined}
        accessibleValue={selectedName ?? 'не выбран'}
        icon={selectedAccount && <AccountIcon value={selectedAccount.icon} size={24} />}
        isOpen={isOpen} onOpen={() => {
          setSearch('')
          setIsOpen(true)
        }} />

      <EntitySelectModal
        title={label}
        isOpen={isOpen}
        onDismiss={() => setIsOpen(false)}
      >
        <IonSearchbar
          value={search}
          placeholder="Поиск счетов"
          aria-label="Поиск счетов"
          debounce={0}
          onIonInput={(event) => setSearch(event.detail.value ?? '')}
        />
        {filteredAccounts.length === 0 ? (
          <p className="account-select-modal__empty" role="status">{query ? 'Счета не найдены' : 'Нет доступных счетов'}</p>
        ) : (
          <IonList inset className="account-select-modal__list">
            {groups.map((group) => <Fragment key={group.key}>
              {group.title && <IonItemDivider className="account-select-group-divider">
                <IonLabel>{group.title}</IonLabel>
              </IonItemDivider>}
              {group.accounts.map((account) => {
                const selected = account.id === value
                return (
                  <IonItem
                    button
                    detail={false}
                    key={account.id}
                    className="account-select-option"
                    aria-label={`${account.name}${account.ownerUsername ? `, @${account.ownerUsername}` : ''}, ${account.currency}`}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => selectAccount(account.id)}
                  >
                    <span slot="start" className="account-select-icon">
                      <AccountIcon value={account.icon} size={42} />
                    </span>
                    <IonLabel>
                      <h2>{account.name}</h2>
                      <p>
                        {account.ownerUsername && `@${account.ownerUsername} · `}
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
            </Fragment>)}
          </IonList>
        )}
      </EntitySelectModal>
    </>
  )
}
