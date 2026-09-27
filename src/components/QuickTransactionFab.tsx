import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { IonFab, IonFabButton, IonIcon } from '@ionic/react'
import {
  addOutline,
  closeOutline,
  removeOutline,
  swapHorizontalOutline,
} from 'ionicons/icons'
import type { TransactionType } from '@/api/transactions'

import './QuickTransactionFab.css'

const ACTIONS: { type: TransactionType; label: string; icon: string }[] = [
  { type: 'expense', label: 'Добавить расход', icon: removeOutline },
  { type: 'income', label: 'Добавить доход', icon: addOutline },
  { type: 'transfer', label: 'Добавить перевод', icon: swapHorizontalOutline },
]

function transactionTypeAtPoint(x: number, y: number): TransactionType | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-transaction-type]')
  const type = element?.dataset.transactionType
  return type === 'expense' || type === 'income' || type === 'transfer' ? type : null
}

export function QuickTransactionFab({
  onSelect,
  className,
}: {
  onSelect: (type: TransactionType) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [activeType, setActiveType] = useState<TransactionType | null>(null)
  const suppressClick = useRef(false)

  function select(type: TransactionType) {
    setOpen(false)
    setActiveType(null)
    onSelect(type)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLIonFabButtonElement>) {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    suppressClick.current = true
    setOpen(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLIonFabButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setActiveType(transactionTypeAtPoint(event.clientX, event.clientY))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLIonFabButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const selectedType = transactionTypeAtPoint(event.clientX, event.clientY) ?? activeType
    event.currentTarget.releasePointerCapture(event.pointerId)
    globalThis.setTimeout(() => { suppressClick.current = false }, 0)
    setActiveType(null)
    if (selectedType) select(selectedType)
  }

  return (
    <IonFab
      slot="fixed"
      vertical="bottom"
      horizontal="end"
      className={['quick-transaction-fab', open && 'quick-transaction-fab--open', className]
        .filter(Boolean).join(' ')}
    >
      <IonFabButton
        aria-label={open ? 'Закрыть быстрое добавление' : 'Добавить транзакцию'}
        aria-expanded={open}
        aria-haspopup="menu"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          suppressClick.current = false
          setActiveType(null)
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          setOpen((value) => !value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <IonIcon icon={open ? closeOutline : addOutline} />
      </IonFabButton>

      <div className="quick-transaction-fab__actions" role="menu" aria-label="Тип новой транзакции" aria-hidden={!open}>
        {ACTIONS.map((action) => (
          <div key={action.type} className={`quick-transaction-fab__action quick-transaction-fab__action--${action.type}`}>
            <IonFabButton
              size="small"
              color={action.type === 'expense' ? 'danger' : action.type === 'income' ? 'success' : 'primary'}
              aria-label={action.label}
              role="menuitem"
              data-transaction-type={action.type}
              className={activeType === action.type ? 'quick-transaction-fab__button--active' : undefined}
              disabled={!open}
              tabIndex={open ? 0 : -1}
              onClick={() => select(action.type)}
            >
              <IonIcon icon={action.icon} />
            </IonFabButton>
          </div>
        ))}
      </div>
    </IonFab>
  )
}
