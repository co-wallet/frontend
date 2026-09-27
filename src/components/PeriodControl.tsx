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
type RangeBoundary = 'from' | 'to'

const SIMPLE_PERIODS: SimplePeriod[] = ['day', 'month', 'year']
const PERIOD_PRESET_LABELS: Record<SimplePeriod, string> = {
  day: 'День',
  month: 'Месяц',
  year: 'Год',
}

function isSimplePeriod(period: Period): period is SimplePeriod {
  return SIMPLE_PERIODS.includes(period as SimplePeriod)
}

function formatRangeDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year.slice(-2)}`
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
  const isCustomPeriod = period === 'custom'
  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)
  const today = computeDateRange('day', 0, '', '').dateTo
  const [draftFrom, setDraftFrom] = useState(dateFrom)
  const [draftTo, setDraftTo] = useState(dateTo)
  const [calendarValue, setCalendarValue] = useState(dateFrom)
  const [activeBoundary, setActiveBoundary] = useState<RangeBoundary>('from')
  const [activePreset, setActivePreset] = useState<SimplePeriod | null>(isSimplePeriod(period) ? period : null)

  function openPicker() {
    setDraftFrom(dateFrom)
    setDraftTo(dateTo)
    setCalendarValue(dateFrom)
    setActiveBoundary('from')
    setActivePreset(isSimplePeriod(period) ? period : null)
    setPickerOpen(true)
  }

  function selectPeriodType(nextPeriod: SimplePeriod) {
    const range = computeDateRange(nextPeriod, 0, '', '')
    setDraftFrom(range.dateFrom)
    setDraftTo(range.dateTo)
    setCalendarValue(range.dateFrom)
    setActiveBoundary('from')
    setActivePreset(nextPeriod)
  }

  function selectRangeDate(date: string) {
    setActivePreset(null)
    setCalendarValue(date)
    if (activeBoundary === 'from') {
      setDraftFrom(date)
      if (date > draftTo) setDraftTo(date)
      setActiveBoundary('to')
      return
    }

    if (date < draftFrom) {
      setDraftTo(draftFrom)
      setDraftFrom(date)
    } else {
      setDraftTo(date)
    }
    setActiveBoundary('from')
  }

  function applyRange() {
    const matchingPeriod = SIMPLE_PERIODS.find((candidate) => {
      const offset = periodOffsetForDate(candidate, draftFrom)
      const range = computeDateRange(candidate, offset, '', '')
      return range.dateFrom === draftFrom && range.dateTo === draftTo
    })

    if (matchingPeriod) {
      onChange({
        period: matchingPeriod,
        periodOffset: periodOffsetForDate(matchingPeriod, draftFrom),
        customFrom: draftFrom,
        customTo: draftTo,
      })
    } else {
      onChange({ period: 'custom', periodOffset: 0, customFrom: draftFrom, customTo: draftTo })
    }
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
                fill={activePreset === option ? 'solid' : 'outline'}
                aria-pressed={activePreset === option}
                aria-label={PERIOD_PRESET_LABELS[option]}
                onClick={() => selectPeriodType(option)}
              >
                {PERIOD_PRESET_LABELS[option]}
              </IonButton>
            ))}
          </div>

          <div className="period-control-picker__range" aria-label="Границы периода">
            <IonButton
              fill={activeBoundary === 'from' ? 'solid' : 'outline'}
              aria-pressed={activeBoundary === 'from'}
              aria-label={`Начало периода: ${formatRangeDate(draftFrom)}`}
              onClick={() => {
                setActiveBoundary('from')
                setCalendarValue(draftFrom)
              }}
            >
              <span>С</span>
              <strong>{formatRangeDate(draftFrom)}</strong>
            </IonButton>
            <IonButton
              fill={activeBoundary === 'to' ? 'solid' : 'outline'}
              aria-pressed={activeBoundary === 'to'}
              aria-label={`Конец периода: ${formatRangeDate(draftTo)}`}
              onClick={() => {
                setActiveBoundary('to')
                setCalendarValue(draftTo)
              }}
            >
              <span>По</span>
              <strong>{formatRangeDate(draftTo)}</strong>
            </IonButton>
          </div>

          <div className="period-control-picker__value">
            <IonDatetime
              presentation="date"
              value={calendarValue}
              max={today}
              onIonChange={(event) => {
                const selectedDate = valueFromDatetime(event.detail.value)
                if (!selectedDate) return
                selectRangeDate(selectedDate)
              }}
            />
          </div>

          <IonButton
            className="period-control-picker__apply"
            expand="block"
            aria-label="Применить период"
            onClick={applyRange}
          >
            Применить
          </IonButton>
        </IonContent>
      </IonModal>

    </div>
  )
}
