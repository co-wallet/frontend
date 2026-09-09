import { useId, useRef, type ReactNode } from 'react'
import { IonButton, IonIcon, IonSelect, IonSelectOption, IonModal, IonDatetime, IonDatetimeButton } from '@ionic/react'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
import { computeDateRange, PERIOD_LABELS, type Period } from '@/store/periodStore'
import { formatPeriodControlLabel } from '@/lib/transactionList'
import type { TransactionPeriod } from '@/lib/transactionNavigation'
import './PeriodControl.css'

const PERIOD_SELECT_LABELS = { ...PERIOD_LABELS, custom: 'Другой' }

function valueFromDatetime(value: string | string[] | null | undefined): string {
  return typeof value === 'string' ? value.slice(0, 10) : ''
}

export function PeriodControl({ value, onChange, trailingControl }: {
  value: TransactionPeriod
  onChange: (value: Partial<TransactionPeriod>) => void
  trailingControl?: ReactNode
}) {
  const { period, periodOffset, customFrom, customTo } = value
  const dateControlId = useId()
  const customFromModalRef = useRef<HTMLIonModalElement>(null)
  const customToModalRef = useRef<HTMLIonModalElement>(null)
  const isCustomPeriod = period === 'custom'
  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)
  return (
    <div className="period-control">
      <div className={`period-control__row${trailingControl ? ' period-control__row--trailing' : ''}`} aria-label="Период и фильтры">
        <IonButton
          fill="clear"
          className="period-control-arrow"
          onClick={() => onChange({ periodOffset: periodOffset - 1 })}
          disabled={isCustomPeriod}
          aria-label="Предыдущий период"
        >
          <IonIcon slot="icon-only" icon={chevronBackOutline} />
        </IonButton>

        <div className="period-control-selector">
          <IonSelect
            aria-label={`Выбранный период: ${formatPeriodControlLabel(period, dateFrom, dateTo)}`}
            interface="popover"
            value={period}
            selectedText={formatPeriodControlLabel(period, dateFrom, dateTo)}
            onIonChange={(event) => onChange({ period: event.detail.value as Period, periodOffset: 0 })}
          >
            {(Object.keys(PERIOD_SELECT_LABELS) as Period[]).map((option) => (
              <IonSelectOption key={option} value={option}>
                {PERIOD_SELECT_LABELS[option]}
              </IonSelectOption>
            ))}
          </IonSelect>
        </div>

        <IonButton
          fill="clear"
          className="period-control-arrow"
          onClick={() => onChange({ periodOffset: periodOffset + 1 })}
          disabled={isCustomPeriod || periodOffset >= 0}
          aria-label="Следующий период"
        >
          <IonIcon slot="icon-only" icon={chevronForwardOutline} />
        </IonButton>

        {trailingControl}
      </div>

      {isCustomPeriod && (
        <div className="period-control-custom" aria-label="Другой период">
          <div className="period-control-custom__field">
            <span>С</span>
            <IonDatetimeButton datetime={`${dateControlId}-from`} />
          </div>
          <div className="period-control-custom__field">
            <span>По</span>
            <IonDatetimeButton datetime={`${dateControlId}-to`} />
          </div>
          <IonModal ref={customFromModalRef} keepContentsMounted>
            <IonDatetime
              id={`${dateControlId}-from`}
              presentation="date"
              value={customFrom}
              max={customTo}
              onIonChange={(event) => {
                const value = valueFromDatetime(event.detail.value)
                if (!value) return
                onChange({ customFrom: value })
                void customFromModalRef.current?.dismiss()
              }}
            />
          </IonModal>
          <IonModal ref={customToModalRef} keepContentsMounted>
            <IonDatetime
              id={`${dateControlId}-to`}
              presentation="date"
              value={customTo}
              min={customFrom}
              onIonChange={(event) => {
                const value = valueFromDatetime(event.detail.value)
                if (!value) return
                onChange({ customTo: value })
                void customToModalRef.current?.dismiss()
              }}
            />
          </IonModal>
        </div>
      )}

    </div>
  )
}
