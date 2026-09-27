import { useId, useRef, useState, type ReactNode } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
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
  PERIOD_LABELS,
  type NavigablePeriod,
  type Period,
} from '@/store/periodStore'
import { formatPeriodControlLabel } from '@/lib/transactionList'
import type { TransactionPeriod } from '@/lib/transactionNavigation'
import './PeriodControl.css'

const PERIOD_SELECT_LABELS = { ...PERIOD_LABELS, custom: 'Другой' }
const PERIOD_PRESET_LABELS: Record<Period, string> = {
  day: 'Текущий день',
  week: 'Текущая неделя',
  month: 'Текущий месяц',
  quarter: 'Текущий квартал',
  year: 'Текущий год',
  custom: 'Другой период',
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
  const dateControlId = useId()
  const customFromModalRef = useRef<HTMLIonModalElement>(null)
  const customToModalRef = useRef<HTMLIonModalElement>(null)
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [quarterYear, setQuarterYear] = useState(() => Number(computeDateRange(
    period,
    periodOffset,
    customFrom,
    customTo,
  ).dateFrom.slice(0, 4)))
  const isCustomPeriod = period === 'custom'
  const { dateFrom, dateTo } = computeDateRange(period, periodOffset, customFrom, customTo)
  const today = computeDateRange('day', 0, '', '').dateTo
  const currentYear = Number(today.slice(0, 4))
  const currentQuarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1
  const selectedQuarter = Math.floor((Number(dateFrom.slice(5, 7)) - 1) / 3) + 1

  function openPicker() {
    setQuarterYear(Number(dateFrom.slice(0, 4)))
    setPickerOpen(true)
  }

  function selectPeriodType(nextPeriod: Period) {
    onChange({ period: nextPeriod, periodOffset: 0 })
    if (nextPeriod === 'quarter') setQuarterYear(currentYear)
  }

  function selectNavigableDate(nextPeriod: NavigablePeriod, date: string) {
    onChange({ periodOffset: periodOffsetForDate(nextPeriod, date) })
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
            {(Object.keys(PERIOD_SELECT_LABELS) as Period[]).map((option) => (
              <IonButton
                key={option}
                fill={period === option ? 'solid' : 'outline'}
                aria-pressed={period === option}
                aria-label={PERIOD_PRESET_LABELS[option]}
                onClick={() => selectPeriodType(option)}
              >
                {PERIOD_SELECT_LABELS[option]}
              </IonButton>
            ))}
          </div>
          <p className="period-control-picker__hint">
            Смена типа выбирает текущий период. Затем можно выбрать другое значение.
          </p>

          {!isCustomPeriod && period !== 'quarter' && (
            <div className="period-control-picker__value">
              {period === 'week' && (
                <p className="period-control-picker__value-hint">Выберите любой день нужной недели</p>
              )}
              <IonDatetime
                id={`${dateControlId}-picker`}
                presentation={period === 'month' ? 'month-year' : period === 'year' ? 'year' : 'date'}
                preferWheel={period === 'month' || period === 'year'}
                value={dateFrom}
                max={today}
                showDefaultButtons
                doneText="Выбрать"
                cancelText="Отмена"
                onIonCancel={() => setPickerOpen(false)}
                onIonChange={(event) => {
                  const selectedDate = valueFromDatetime(event.detail.value)
                  if (!selectedDate) return
                  selectNavigableDate(period as NavigablePeriod, selectedDate)
                }}
              />
            </div>
          )}

          {period === 'quarter' && (
            <div className="period-control-quarter" aria-label="Выбор квартала">
              <div className="period-control-quarter__year">
                <IonButton
                  fill="clear"
                  aria-label="Предыдущий год"
                  onClick={() => setQuarterYear((year) => year - 1)}
                >
                  <IonIcon slot="icon-only" icon={chevronBackOutline} />
                </IonButton>
                <strong>{quarterYear}</strong>
                <IonButton
                  fill="clear"
                  aria-label="Следующий год"
                  disabled={quarterYear >= currentYear}
                  onClick={() => setQuarterYear((year) => Math.min(currentYear, year + 1))}
                >
                  <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                </IonButton>
              </div>
              <div className="period-control-quarter__grid">
                {[1, 2, 3, 4].map((quarter) => {
                  const disabled = quarterYear > currentYear
                    || (quarterYear === currentYear && quarter > currentQuarter)
                  const selected = quarterYear === Number(dateFrom.slice(0, 4)) && quarter === selectedQuarter
                  return (
                    <IonButton
                      key={quarter}
                      fill={selected ? 'solid' : 'outline'}
                      disabled={disabled}
                      aria-label={`${quarter} квартал ${quarterYear}`}
                      onClick={() => selectNavigableDate(
                        'quarter',
                        `${quarterYear}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`,
                      )}
                    >
                      {quarter} квартал
                    </IonButton>
                  )
                })}
              </div>
            </div>
          )}

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
                    const nextValue = valueFromDatetime(event.detail.value)
                    if (!nextValue) return
                    onChange({ customFrom: nextValue })
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
                    const nextValue = valueFromDatetime(event.detail.value)
                    if (!nextValue) return
                    onChange({ customTo: nextValue })
                    void customToModalRef.current?.dismiss()
                  }}
                />
              </IonModal>
            </div>
          )}
        </IonContent>
      </IonModal>

    </div>
  )
}
