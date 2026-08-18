import type { CSSProperties } from 'react'
import { useId } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { IonInput } from '@ionic/react'
import {
  Airplane,
  Bank,
  Cardholder,
  Car,
  ChartLineUp,
  Check,
  Coins,
  CreditCard,
  CurrencyBtc,
  CurrencyDollar,
  CurrencyEur,
  CurrencyRub,
  Money,
  PiggyBank,
  UsersThree,
  Vault,
  Wallet,
} from '@phosphor-icons/react'

import './AccountIcon.css'

const PRESET_PREFIX = 'preset:'
const CUSTOM_PREFIX = 'custom:'
const APPEARANCE_SEPARATOR = '|'

export const MAX_CUSTOM_ACCOUNT_ICON_LENGTH = 8

export type AccountIconColorId =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'green'
  | 'yellow'
  | 'graphite'

export type AccountIconBorderColorId = AccountIconColorId | 'none'

interface AccountIconColor {
  id: AccountIconColorId
  label: string
  shortLabel?: string
}

export const ACCOUNT_ICON_COLORS: readonly AccountIconColor[] = [
  { id: 'blue', label: 'Синий' },
  { id: 'purple', label: 'Фиолетовый', shortLabel: 'Фиолет.' },
  { id: 'pink', label: 'Розовый' },
  { id: 'red', label: 'Красный' },
  { id: 'orange', label: 'Оранжевый', shortLabel: 'Оранжев.' },
  { id: 'green', label: 'Зелёный' },
  { id: 'yellow', label: 'Жёлтый' },
  { id: 'graphite', label: 'Графит' },
] as const

const DEFAULT_FOREGROUND_COLOR: AccountIconColorId = 'blue'
const DEFAULT_BORDER_COLOR: AccountIconBorderColorId = 'blue'
const accountIconColorIds = new Set<AccountIconColorId>(
  ACCOUNT_ICON_COLORS.map((color) => color.id),
)

interface AccountIconPreset {
  id: string
  label: string
  icon: PhosphorIcon
}

export const ACCOUNT_ICON_PRESETS: readonly AccountIconPreset[] = [
  { id: 'cash', label: 'Наличные', icon: Money },
  { id: 'ruble', label: 'Рубли', icon: CurrencyRub },
  { id: 'dollar', label: 'Доллары', icon: CurrencyDollar },
  { id: 'euro', label: 'Евро', icon: CurrencyEur },
  { id: 'bank', label: 'Банк', icon: Bank },
  { id: 'debit-card', label: 'Дебетовая', icon: Cardholder },
  { id: 'credit-card', label: 'Кредитка', icon: CreditCard },
  { id: 'coins', label: 'Монеты', icon: Coins },
  { id: 'piggy-bank', label: 'Копилка', icon: PiggyBank },
  { id: 'wallet', label: 'Кошелёк', icon: Wallet },
  { id: 'investments', label: 'Инвестиции', icon: ChartLineUp },
  { id: 'bitcoin', label: 'Биткоин', icon: CurrencyBtc },
  { id: 'savings', label: 'Накопления', icon: Vault },
  { id: 'shared', label: 'Семейный', icon: UsersThree },
  { id: 'car', label: 'Авто', icon: Car },
  { id: 'travel', label: 'Поездки', icon: Airplane },
] as const

export const DEFAULT_ACCOUNT_ICON = `${PRESET_PREFIX}debit-card`

const presetsById = new Map(ACCOUNT_ICON_PRESETS.map((preset) => [preset.id, preset]))

const legacyIconPresets: Record<string, string> = {
  '💳': 'debit-card',
  '💵': 'cash',
  '🏦': 'bank',
  '💰': 'piggy-bank',
  '📈': 'investments',
  '🏠': 'shared',
  '🚗': 'car',
  '✈️': 'travel',
}

interface AccountIconAppearance {
  foreground: AccountIconColorId
  border: AccountIconBorderColorId
}

type ResolvedAccountIcon = AccountIconAppearance & (
  | { kind: 'preset'; preset: AccountIconPreset }
  | { kind: 'custom'; label: string }
)

function presetValue(id: string): string {
  return `${PRESET_PREFIX}${id}`
}

export function customAccountIconValue(label: string): string {
  const sanitizedLabel = label.replace(/\|/g, '')
  return `${CUSTOM_PREFIX}${sanitizedLabel.slice(0, MAX_CUSTOM_ACCOUNT_ICON_LENGTH)}`
}

function resolveAccountIcon(value?: string | null): ResolvedAccountIcon {
  const [baseValue = '', foregroundValue, borderValue] = (value ?? '').split(
    APPEARANCE_SEPARATOR,
    3,
  )
  const foregroundCandidate = foregroundValue === 'teal' ? 'yellow' : foregroundValue
  const borderCandidate = borderValue === 'teal' ? 'yellow' : borderValue
  const foreground = accountIconColorIds.has(foregroundCandidate as AccountIconColorId)
    ? foregroundCandidate as AccountIconColorId
    : DEFAULT_FOREGROUND_COLOR
  const border = borderCandidate === 'none' || accountIconColorIds.has(borderCandidate as AccountIconColorId)
    ? borderCandidate as AccountIconBorderColorId
    : DEFAULT_BORDER_COLOR

  if (baseValue.startsWith(PRESET_PREFIX)) {
    const preset = presetsById.get(baseValue.slice(PRESET_PREFIX.length))
    if (preset) return { kind: 'preset', preset, foreground, border }
  }

  if (baseValue.startsWith(CUSTOM_PREFIX)) {
    return {
      kind: 'custom',
      label: baseValue.slice(
        CUSTOM_PREFIX.length,
        CUSTOM_PREFIX.length + MAX_CUSTOM_ACCOUNT_ICON_LENGTH,
      ),
      foreground,
      border,
    }
  }

  if (baseValue && legacyIconPresets[baseValue]) {
    return {
      kind: 'preset',
      preset: presetsById.get(legacyIconPresets[baseValue])!,
      foreground,
      border,
    }
  }

  if (baseValue) {
    return {
      kind: 'custom',
      label: baseValue.slice(0, MAX_CUSTOM_ACCOUNT_ICON_LENGTH),
      foreground,
      border,
    }
  }

  return {
    kind: 'preset',
    preset: presetsById.get('debit-card')!,
    foreground,
    border,
  }
}

function baseAccountIconValue(resolved: ResolvedAccountIcon): string {
  return resolved.kind === 'preset'
    ? presetValue(resolved.preset.id)
    : customAccountIconValue(resolved.label)
}

function serializeAccountIcon(
  baseValue: string,
  foreground: AccountIconColorId,
  border: AccountIconBorderColorId,
): string {
  if (foreground === DEFAULT_FOREGROUND_COLOR && border === DEFAULT_BORDER_COLOR) {
    return baseValue
  }

  return [baseValue, foreground, border].join(APPEARANCE_SEPARATOR)
}

function replaceAccountIconBase(value: string, baseValue: string): string {
  const current = resolveAccountIcon(value)
  return serializeAccountIcon(baseValue, current.foreground, current.border)
}

export function updateAccountIconAppearance(
  value: string,
  appearance: Partial<AccountIconAppearance>,
): string {
  const resolved = resolveAccountIcon(value)
  return serializeAccountIcon(
    baseAccountIconValue(resolved),
    appearance.foreground ?? resolved.foreground,
    appearance.border ?? resolved.border,
  )
}

export function normalizeAccountIconValue(value?: string | null): string {
  const resolved = resolveAccountIcon(value)
  if (resolved.kind === 'preset') {
    return serializeAccountIcon(
      presetValue(resolved.preset.id),
      resolved.foreground,
      resolved.border,
    )
  }

  const label = resolved.label.trim()
  return serializeAccountIcon(
    label ? customAccountIconValue(label) : DEFAULT_ACCOUNT_ICON,
    resolved.foreground,
    resolved.border,
  )
}

export function getCustomAccountIconLabel(value?: string | null): string | null {
  const resolved = resolveAccountIcon(value)
  return resolved.kind === 'custom' ? resolved.label : null
}

function customLabelFontSize(label: string, size: number): number {
  if (label.length <= 2) return Math.round(size * 0.42)
  if (label.length <= 5) return Math.round(size * 0.25)
  return Math.round(size * 0.2)
}

interface AccountIconCSSProperties extends CSSProperties {
  '--account-icon-foreground': string
  '--account-icon-foreground-rgb': string
  '--account-icon-border': string
}

function accountIconStyle(resolved: ResolvedAccountIcon, size: number): AccountIconCSSProperties {
  const foreground = resolved.foreground === 'yellow'
    ? 'var(--account-icon-foreground-yellow)'
    : `var(--account-icon-color-${resolved.foreground})`
  const foregroundRgb = resolved.foreground === 'yellow'
    ? 'var(--account-icon-foreground-yellow-rgb)'
    : `var(--account-icon-color-${resolved.foreground}-rgb)`

  return {
    width: size,
    height: size,
    '--account-icon-foreground': foreground,
    '--account-icon-foreground-rgb': foregroundRgb,
    '--account-icon-border': resolved.border === 'none'
      ? 'transparent'
      : `var(--account-icon-color-${resolved.border})`,
  }
}

export function AccountIcon({
  value,
  size = 44,
  framed = true,
}: {
  value?: string | null
  size?: number
  framed?: boolean
}) {
  const resolved = resolveAccountIcon(value)
  const className = framed ? 'account-icon' : 'account-icon account-icon--unframed'
  const style = accountIconStyle(resolved, size)

  if (resolved.kind === 'preset') {
    const PresetIcon = resolved.preset.icon
    return (
      <span
        className={className}
        style={style}
        role="img"
        aria-label={resolved.preset.label}
      >
        <PresetIcon size={Math.round(size * 0.58)} weight="regular" aria-hidden="true" />
      </span>
    )
  }

  const label = resolved.label.trim() || 'Aa'
  return (
    <span
      className={`${className} account-icon--custom`}
      style={{ ...style, fontSize: customLabelFontSize(label, size) }}
      role="img"
      aria-label={resolved.label.trim() ? `Своя иконка: ${resolved.label.trim()}` : 'Своя иконка'}
    >
      {label}
    </span>
  )
}

function AccountIconColorGroup({
  legend,
  kind,
  value,
  onChange,
}: {
  legend: string
  kind: 'foreground' | 'border'
  value: AccountIconBorderColorId
  onChange: (value: AccountIconBorderColorId) => void
}) {
  const options: ReadonlyArray<{
    id: AccountIconBorderColorId
    label: string
    shortLabel?: string
  }> = kind === 'border'
    ? [{ id: 'none', label: 'Без обводки' }, ...ACCOUNT_ICON_COLORS]
    : ACCOUNT_ICON_COLORS

  return (
    <fieldset className="account-icon-color-group">
      <legend>{legend}</legend>
      <div className="account-icon-color-grid" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const selected = value === option.id
          const isNone = option.id === 'none'
          const style = {
            '--account-icon-swatch': isNone
              ? 'var(--ion-color-medium)'
              : `var(--account-icon-color-${option.id})`,
          } as CSSProperties

          return (
            <button
              className="account-icon-color-option"
              type="button"
              role="radio"
              key={option.id}
              aria-checked={selected}
              aria-label={`${legend}: ${option.label}`}
              title={option.label}
              style={style}
              onClick={() => onChange(option.id)}
            >
              <span
                className={`account-icon-color-swatch account-icon-color-swatch--${kind}${isNone ? ' account-icon-color-swatch--none' : ''}`}
                aria-hidden="true"
              />
              <span>{isNone ? 'Без' : option.shortLabel ?? option.label}</span>
              {selected && <Check className="account-icon-color-check" size={13} weight="bold" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function AccountIconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const resolved = resolveAccountIcon(value)
  const customLabel = resolved.kind === 'custom' ? resolved.label : null
  const titleId = useId()
  const customInputId = useId()

  return (
    <section className="account-icon-picker" aria-labelledby={titleId}>
      <div className="account-icon-picker__header">
        <h2 id={titleId}>Иконка счёта</h2>
        <p>Выберите подходящую или создайте свою</p>
      </div>

      <div className="account-icon-picker__grid">
        {ACCOUNT_ICON_PRESETS.map((preset) => {
          const optionValue = presetValue(preset.id)
          const styledOptionValue = replaceAccountIconBase(value, optionValue)
          const selected = resolved.kind === 'preset' && resolved.preset.id === preset.id

          return (
            <button
              className="account-icon-option"
              type="button"
              key={preset.id}
              aria-label={`Иконка «${preset.label}»`}
              aria-pressed={selected}
              onClick={() => onChange(styledOptionValue)}
            >
              <AccountIcon value={styledOptionValue} size={36} />
              <span>{preset.label}</span>
            </button>
          )
        })}

        <button
          className="account-icon-option"
          type="button"
          aria-label="Своя текстовая иконка"
          aria-pressed={customLabel !== null}
          onClick={() => onChange(
            replaceAccountIconBase(value, customAccountIconValue(customLabel ?? '')),
          )}
        >
          <AccountIcon
            value={replaceAccountIconBase(value, customAccountIconValue(customLabel ?? ''))}
            size={36}
          />
          <span>Своя</span>
        </button>
      </div>

      {customLabel !== null && (
        <div className="account-icon-picker__custom">
          <AccountIcon value={value} size={48} />
          <div className="account-icon-picker__custom-field">
            <IonInput
              id={customInputId}
              label="Текст или символ"
              labelPlacement="stacked"
              fill="outline"
              value={customLabel}
              maxlength={MAX_CUSTOM_ACCOUNT_ICON_LENGTH}
              placeholder="Alfa, TBank, ₽"
              autocomplete="off"
              helperText={`До ${MAX_CUSTOM_ACCOUNT_ICON_LENGTH} символов`}
              onIonInput={(event) => onChange(replaceAccountIconBase(
                value,
                customAccountIconValue(event.detail.value ?? ''),
              ))}
            />
          </div>
        </div>
      )}

      <div className="account-icon-appearance">
        <div className="account-icon-appearance__header">
          <h3>Оформление</h3>
          <p>Цвет иконки и обводки настраиваются независимо</p>
        </div>

        <AccountIconColorGroup
          legend="Цвет иконки"
          kind="foreground"
          value={resolved.foreground}
          onChange={(foreground) => onChange(updateAccountIconAppearance(
            value,
            { foreground: foreground as AccountIconColorId },
          ))}
        />
        <AccountIconColorGroup
          legend="Цвет обводки"
          kind="border"
          value={resolved.border}
          onChange={(border) => onChange(updateAccountIconAppearance(value, { border }))}
        />
      </div>
    </section>
  )
}
