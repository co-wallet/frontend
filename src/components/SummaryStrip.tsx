import { IonSkeletonText } from '@ionic/react'
import { formatCurrencyAmount } from '@/lib/transactionList'
import './SummaryStrip.css'

export interface SummaryStripItem {
  kind: 'balance' | 'expense' | 'income'
  amount: number
  label: string
  active: boolean
  onSelect: () => void
  loading?: boolean
  error?: boolean
  title?: string
}

export function SummaryStrip({ items, currency, label }: {
  items: SummaryStripItem[]
  currency: string
  label: string
}) {
  return (
    <section className="summary-strip" aria-label={label}>
      {items.map((item) => {
        const amount = formatCurrencyAmount(item.amount, currency, 2)
        return (
          <button
            key={item.kind}
            type="button"
            className={`summary-strip__item${item.active ? ` summary-strip__item--active summary-strip__item--${item.kind}` : ''}`}
            aria-label={item.label}
            aria-pressed={item.active}
            title={item.title}
            onClick={item.onSelect}
          >
            {item.loading ? (
              <IonSkeletonText animated className="summary-strip__skeleton" />
            ) : item.error ? (
              <strong className="summary-strip__amount">—</strong>
            ) : (
              <strong className={`summary-strip__amount summary-strip__amount--${item.kind}`} title={amount}>
                {amount}
              </strong>
            )}
          </button>
        )
      })}
    </section>
  )
}
