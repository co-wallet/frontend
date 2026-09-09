import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonNote,
  IonRouterLink,
} from '@ionic/react'
import {
  createOutline,
  peopleOutline,
  swapHorizontalOutline,
  trashOutline,
} from 'ionicons/icons'

import type { Account } from '@/api/accounts'
import type { Category } from '@/api/categories'
import type { Transaction } from '@/api/transactions'
import {
  CategoryIcon,
  UNCATEGORIZED_CATEGORY_ICON,
} from '@/components/CategoryIcon'
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
  category?: Category
  currentUserId?: string
  defaultCurrency: string
  tagHref?: (id: string) => string
  onEdit: (id: string) => void
  onDelete?: (id: string) => void
  showTags?: boolean
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
  tagHref,
  showTags = true,
}: TransactionItemProps) {
  const description = tx.description?.trim()
  const categoryName = category?.name ?? 'Без категории'
  const title = description
    || (tx.type === 'transfer' ? TRANSACTION_TYPE_LABELS.transfer : categoryName)
  const accountLabel = tx.type === 'transfer'
    ? `${account?.name ?? tx.accountName ?? 'Счёт'} → ${toAccount?.name ?? tx.toAccountName ?? 'Счёт'}`
    : account?.name ?? tx.accountName ?? 'Счёт'
  const meta = description && tx.type !== 'transfer'
    ? `${categoryName} · ${accountLabel}`
    : accountLabel
  const displayAmount = tx.readOnly ? tx.toAmount ?? tx.amount : transactionUserAmount(tx, account, currentUserId)
  const amount = tx.readOnly
    ? formatTransactionAmount(tx.toAmount ?? tx.amount, tx.toCurrency || tx.currency, 'income')
    : formatTransactionAmount(displayAmount, tx.currency, tx.type)
  const shared = isSharedTransaction(tx, account, currentUserId)
  const convertedAmount = transactionDefaultCurrencyAmount(
    tx,
    account,
    currentUserId,
    defaultCurrency,
  )
  const showConvertedAmount = !tx.readOnly && convertedAmount != null && tx.currency !== defaultCurrency
  const amountClass = `transaction-item__amount transaction-item__amount--${tx.type}`

  return (
    <IonItemSliding>
      <IonItem
        detail={false}
        lines="full"
        className="transaction-item"
        onClick={() => onEdit(tx.id)}
      >
        <button
          type="button"
          className="transaction-item__open"
          aria-label={`${title}. ${meta}. ${TRANSACTION_TYPE_LABELS[tx.type]} ${displayAmount} ${tx.currency}`}
        />
        {tx.type === 'transfer' ? (
          <div slot="start" className="transaction-item__icon transaction-item__icon--transfer">
            <IonIcon icon={swapHorizontalOutline} aria-hidden="true" />
          </div>
        ) : (
          <span slot="start" className="transaction-item__category-icon">
            {category ? (
              <CategoryIcon value={category.icon} type={category.type} size={40} />
            ) : (
              <CategoryIcon
                value={UNCATEGORIZED_CATEGORY_ICON}
                type={tx.type === 'income' ? 'income' : 'expense'}
                size={40}
                ariaLabel="Без категории"
              />
            )}
          </span>
        )}

        <IonLabel className="transaction-item__label">
          <h2>{title}</h2>
          <p>{meta}</p>
          {showTags && !!tx.tags?.length && (
            <p className="transaction-item__tags">
              {tx.tags.map((tag) => tagHref ? (
                <IonRouterLink
                  key={tag.id}
                  routerLink={tagHref(tag.id)}
                  routerDirection="forward"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Транзакции с тегом ${tag.name}`}
                >
                  #{tag.name}
                </IonRouterLink>
              ) : <span key={tag.id}>#{tag.name}</span>)}
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

      {!tx.readOnly && onDelete && <IonItemOptions side="end">
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
      </IonItemOptions>}
    </IonItemSliding>
  )
}
