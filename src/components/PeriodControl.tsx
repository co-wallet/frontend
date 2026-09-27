import { useState, type ReactNode } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { calendarOutline, chevronBackOutline, chevronDownOutline, chevronForwardOutline } from 'ionicons/icons'
import {
  computeDateRange,
  periodOffsetForDate,
  type Period,
} from '@/store/periodStore'
import { formatPeriodControlLabel } from '@/lib/transactionList'
import type { TransactionPeriod } from '@/lib/transactionNavigation'
import './PeriodControl.css'

type SimplePeriod = Extract<Period, 'day' | 'month' | 'year'>

const SIMPLE_PERIODS: SimplePeriod[] = ['day', 'month', 'year']
const PERIOD_PRESET_LABELS: Record<SimplePeriod, string> = {
  day: 'День',
  month: 'Месяц',
  year: 'Год',
}

function isSimplePeriod(period: Period): period is SimplePeriod {
  return SIMPLE_PERIODS.includes(period as SimplePeriod)
}

function valueFromDatetime(value: string | string[] | null | undefined): string {
  if (typeof value !== 'string') return ''
  const date = value.slice(0, 10)
  if (/^\d{4}$/.test(date)) return `${date}-01-01`
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01`
  return date
}

export function PeriodControl({ value, onChange, trailingControl }: {
  value: TransactionPeriod
  onChange: (value: Partial<TransactionPeriod>) => void
  trailingControl?: ReactNode
}) {
  const { period, periodOffset, customFrom, customTo } = value
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [pickerPeriod, setPickerPeriod] = useState<SimplePeriod>(isSimplePeriod(period) ? period : 'month')
  const isCustomPeriod = period === 'custom'
  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)
  const today = computeDateRange('day', 0, '', '').dateTo

  function openPicker() {
    setPickerPeriod(isSimplePeriod(period) ? period : 'month')
    setPickerOpen(true)
  }

  function selectPeriodType(nextPeriod: SimplePeriod) {
    setPickerPeriod(nextPeriod)
    onChange({ period: nextPeriod, periodOffset: 0 })
  }

  function selectNavigableDate(nextPeriod: SimplePeriod, date: string) {
    onChange({ period: nextPeriod, periodOffset: periodOffsetForDate(nextPeriod, date) })
    setPickerOpen(false)
  }

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

        <IonButton
          fill="clear"
          className="period-control-selector"
          onClick={openPicker}
          aria-label={`Выбрать период. Сейчас: ${formatPeriodControlLabel(period, dateFrom, dateTo)}`}
        >
          <IonIcon slot="start" icon={calendarOutline} />
          <span className="period-control-selector__label">
            {formatPeriodControlLabel(period, dateFrom, dateTo)}
          </span>
          <IonIcon slot="end" icon={chevronDownOutline} />
        </IonButton>

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

      <IonModal
        className="period-control-picker-modal"
        isOpen={isPickerOpen}
        onDidDismiss={() => setPickerOpen(false)}
        keepContentsMounted
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Выбор периода</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setPickerOpen(false)}>Закрыть</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="period-control-picker">
          <div className="period-control-picker__presets" role="group" aria-label="Тип периода">
            {SIMPLE_PERIODS.map((option) => (
              <IonButton
                key={option}
                fill={pickerPeriod === option ? 'solid' : 'outline'}
                aria-pressed={pickerPeriod === option}
                aria-label={PERIOD_PRESET_LABELS[option]}
                onClick={() => selectPeriodType(option)}
              >
                {PERIOD_PRESET_LABELS[option]}
              </IonButton>
            ))}
          </div>

          <div className="period-control-picker__value">
            <IonDatetime
              presentation="date"
              value={isSimplePeriod(period) && period === pickerPeriod ? dateFrom : today}
              max={today}
              showDefaultButtons
              doneText="Выбрать"
              cancelText="Отмена"
              onIonCancel={() => setPickerOpen(false)}
              onIonChange={(event) => {
                const selectedDate = valueFromDatetime(event.detail.value)
                if (!selectedDate) return
                selectNavigableDate(pickerPeriod, selectedDate)
              }}
            />
          </div>
        </IonContent>
      </IonModal>

    </div>
  )
}
