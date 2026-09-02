import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonNote,
} from '@ionic/react'
import {
  createOutline,
  peopleOutline,
  pricetagOutline,
  swapHorizontalOutline,
  trashOutline,
} from 'ionicons/icons'

import type { Account } from '@/api/accounts'
import type { CategoryNode } from '@/api/categories'
import type { Transaction } from '@/api/transactions'
import { CategoryIcon } from '@/components/CategoryIcon'
import {
  formatTransactionAmount,
  isSharedTransaction,
  TRANSACTION_TYPE_LABELS,
  transactionDefaultCurrencyAmount,
  transactionUserAmount,
} from '@/lib/transactionList'

import './TransactionItem.css'

interface TransactionItemProps {
  tx: Transaction
  account?: Account
  toAccount?: Account
  category?: CategoryNode
  currentUserId?: string
  defaultCurrency: string
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function TransactionItem({
  tx,
  account,
  toAccount,
  category,
  currentUserId,
  defaultCurrency,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const description = tx.description?.trim()
  const categoryName = category?.name ?? 'Без категории'
  const title = description
    || (tx.type === 'transfer' ? TRANSACTION_TYPE_LABELS.transfer : categoryName)
  const accountLabel = tx.type === 'transfer'
    ? `${account?.name ?? 'Счёт'} → ${toAccount?.name ?? 'Счёт'}`
    : account?.name ?? 'Счёт'
  const meta = description && tx.type !== 'transfer'
    ? `${categoryName} · ${accountLabel}`
    : accountLabel
  const displayAmount = transactionUserAmount(tx, account, currentUserId)
  const amount = formatTransactionAmount(displayAmount, tx.currency, tx.type)
  const shared = isSharedTransaction(tx, account, currentUserId)
  const convertedAmount = transactionDefaultCurrencyAmount(
    tx,
    account,
    currentUserId,
    defaultCurrency,
  )
  const showConvertedAmount = convertedAmount != null && tx.currency !== defaultCurrency
  const amountClass = `transaction-item__amount transaction-item__amount--${tx.type}`
  const firstTag = tx.tags?.[0]
  const extraTags = Math.max((tx.tags?.length ?? 0) - 1, 0)

  return (
    <IonItemSliding>
      <IonItem
        button
        detail={false}
        lines="full"
        className="transaction-item"
        onClick={() => onEdit(tx.id)}
        aria-label={`${title}. ${meta}. ${TRANSACTION_TYPE_LABELS[tx.type]} ${displayAmount} ${tx.currency}`}
      >
        <div slot="start" className={`transaction-item__icon transaction-item__icon--${tx.type}`}>
          {tx.type === 'transfer' ? (
            <IonIcon icon={swapHorizontalOutline} aria-hidden="true" />
          ) : category ? (
            <CategoryIcon value={category.icon} type={category.type} size={24} />
          ) : (
            <IonIcon icon={pricetagOutline} aria-hidden="true" />
          )}
        </div>

        <IonLabel className="transaction-item__label">
          <h2>{title}</h2>
          <p>{meta}</p>
          {firstTag && (
            <p className="transaction-item__tags">
              #{firstTag.name}{extraTags > 0 ? ` +${extraTags}` : ''}
            </p>
          )}
        </IonLabel>

        <IonNote slot="end" className="transaction-item__amounts">
          <span className={amountClass}>{amount}</span>
          {shared && (
            <span className="transaction-item__amount-meta">
              <IonIcon icon={peopleOutline} aria-hidden="true" />
              Ваша доля
            </span>
          )}
          {showConvertedAmount && (
            <span className="transaction-item__amount-meta">
              ≈ {formatTransactionAmount(convertedAmount, defaultCurrency, tx.type)}
            </span>
          )}
        </IonNote>
      </IonItem>

      <IonItemOptions side="end">
        <IonItemOption
          color="primary"
          onClick={() => onEdit(tx.id)}
          aria-label={`Изменить: ${title}`}
        >
          <IonIcon slot="start" icon={createOutline} />
          Изменить
        </IonItemOption>
        <IonItemOption
          color="danger"
          onClick={() => onDelete(tx.id)}
          aria-label={`Удалить: ${title}`}
        >
          <IonIcon slot="start" icon={trashOutline} />
          Удалить
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  )
}
