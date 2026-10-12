import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  IonItemSliding, IonItem, IonLabel, IonNote, IonButtons,
  IonButton, IonIcon, IonItemOptions, IonItemOption, useIonRouter,
} from '@ionic/react'
import { createOutline, peopleOutline, personOutline, trashOutline } from 'ionicons/icons'
import type { Account } from '@/api/accounts'
import { AccountIcon, DEFAULT_ACCOUNT_ICON } from './AccountIcon'
import { accountKindShortLabel } from '@/lib/accountKind'

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function SortableAccountItem({
  account, isOwner, href, disabled, dragging, onEdit, onDelete,
}: {
  account: Account
  isOwner: boolean
  href: string
  disabled: boolean
  dragging: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const router = useIonRouter()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
    disabled,
    attributes: { role: 'link' },
  })
  const kindLabel = accountKindShortLabel(account.kind)

  return (
    <IonItemSliding ref={setNodeRef} disabled={dragging || disabled}
      className={`account-sortable-row${isDragging ? ' account-sortable-row--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <IonItem className="account-list-item" detail={false}>
        <a
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          className="account-list-link"
          href={href}
          aria-label={`Транзакции по счету ${account.name}`}
          onDragStart={(event) => event.preventDefault()}
          onClick={(event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            router.push(href, 'forward')
          }}
        >
          <span className="account-list-link-content">
            <span className="account-list-icon">
              <AccountIcon value={account.icon ?? DEFAULT_ACCOUNT_ICON} />
            </span>
            <IonLabel className="account-list-label">
              <h2 title={account.name}>{account.name}</h2>
              <div className="account-list-meta">
                <span className="account-list-access" role="img"
                  aria-label={account.accessMode === 'shared' ? 'Совместный счёт' : 'Личный счёт'}
                  title={account.accessMode === 'shared' ? 'Совместный счёт' : 'Личный счёт'}>
                  <IonIcon aria-hidden="true" icon={account.accessMode === 'shared' ? peopleOutline : personOutline} />
                </span>
                <span className="account-list-meta-text" title={kindLabel}>{kindLabel}</span>
              </div>
            </IonLabel>
            {account.balance && (
              <IonNote className="account-list-balance">
                <div style={{ textAlign: 'right' }}>
                  {fmtCurrency(account.balance.native, account.currency)}
                  {account.balance.displayCurrency !== account.currency && (
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                      ≈ {fmtCurrency(account.balance.display, account.balance.displayCurrency)}
                    </div>
                  )}
                  {account.accessMode === 'shared' && (
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                      {fmtCurrency(account.balance.totalNative, account.currency)}
                    </div>
                  )}
                </div>
              </IonNote>
            )}
          </span>
        </a>
        <IonButtons slot="end" className="account-list-actions">
          <IonButton fill="clear" color="medium" title="Редактировать счёт"
            aria-label={`Редактировать счёт ${account.name}`} onClick={onEdit} disabled={dragging}>
            <IonIcon slot="icon-only" icon={createOutline} />
          </IonButton>
        </IonButtons>
      </IonItem>
      <IonItemOptions side="end">
        {account.accessMode === 'shared' && (
          <IonItemOption color="tertiary" routerLink={`/accounts/${account.id}/members`}>
            <IonIcon slot="icon-only" icon={peopleOutline} />
          </IonItemOption>
        )}
        {isOwner && (
          <IonItemOption color="danger" onClick={onDelete}>
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonItemOption>
        )}
      </IonItemOptions>
    </IonItemSliding>
  )
}
