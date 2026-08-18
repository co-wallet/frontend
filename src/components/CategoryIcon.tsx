import { useId } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  Airplane,
  Bank,
  Barbell,
  Basket,
  Beanie,
  BeerBottle,
  Books,
  Brain,
  Briefcase,
  Broom,
  Buildings,
  Bus,
  Campfire,
  Car,
  ChartLineUp,
  Cigarette,
  Coffee,
  Coins,
  CreditCard,
  DeviceMobile,
  Devices,
  Dress,
  Eyeglasses,
  FilmSlate,
  FirstAidKit,
  ForkKnife,
  GameController,
  GasPump,
  Gift,
  GraduationCap,
  Hamburger,
  Hammer,
  HandCoins,
  HandDeposit,
  HandHeart,
  Handshake,
  HandSoap,
  HandWithdraw,
  Hospital,
  House,
  HouseLine,
  Laptop,
  Lightbulb,
  Money,
  MusicNote,
  Package,
  PawPrint,
  Percent,
  PersonSimpleRun,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plant,
  Receipt,
  Rocket,
  SealPercent,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Sneaker,
  SoccerBall,
  Sparkle,
  SprayBottle,
  Syringe,
  Tag,
  Target,
  Taxi,
  Ticket,
  Tooth,
  Train,
  Trophy,
  User,
  Users,
  UsersThree,
  WashingMachine,
  Watch,
} from '@phosphor-icons/react'

import type { CategoryType } from '@/api/categories'
import {
  ACCOUNT_ICON_COLORS,
  accountIconStyle,
  IconAppearanceControls,
  type AccountIconAppearance,
  type AccountIconBorderColorId,
  type AccountIconColorId,
  type AccountIconShape,
} from './AccountIcon'

const PRESET_PREFIX = 'preset:'
const APPEARANCE_SEPARATOR = '|'
const DEFAULT_FOREGROUND_COLOR: AccountIconColorId = 'blue'
const DEFAULT_BORDER_COLOR: AccountIconBorderColorId = 'blue'

interface CategoryIconPreset {
  id: string
  label: string
  icon: PhosphorIcon
  types: readonly CategoryType[]
}

const EXPENSE_TYPES = ['expense'] as const
const INCOME_TYPES = ['income'] as const
const ALL_TYPES = ['expense', 'income'] as const

export const CATEGORY_ICON_PRESETS: readonly CategoryIconPreset[] = [
  { id: 'other', label: 'Другое', icon: Tag, types: ALL_TYPES },
  { id: 'groceries', label: 'Продукты', icon: ShoppingCart, types: EXPENSE_TYPES },
  { id: 'fast-food', label: 'Фастфуд', icon: Hamburger, types: EXPENSE_TYPES },
  { id: 'pizza', label: 'Пицца', icon: Pizza, types: EXPENSE_TYPES },
  { id: 'cafe', label: 'Кафе', icon: Coffee, types: EXPENSE_TYPES },
  { id: 'drinks', label: 'Напитки', icon: BeerBottle, types: EXPENSE_TYPES },
  { id: 'restaurants', label: 'Рестораны', icon: ForkKnife, types: EXPENSE_TYPES },
  { id: 'car', label: 'Авто', icon: Car, types: EXPENSE_TYPES },
  { id: 'fuel', label: 'Топливо', icon: GasPump, types: EXPENSE_TYPES },
  { id: 'bus', label: 'Автобус', icon: Bus, types: EXPENSE_TYPES },
  { id: 'travel', label: 'Путешествия', icon: Airplane, types: EXPENSE_TYPES },
  { id: 'taxi', label: 'Такси', icon: Taxi, types: EXPENSE_TYPES },
  { id: 'train', label: 'Поезд', icon: Train, types: EXPENSE_TYPES },
  { id: 'home', label: 'Дом', icon: House, types: EXPENSE_TYPES },
  { id: 'utilities', label: 'Коммунальные', icon: Lightbulb, types: EXPENSE_TYPES },
  { id: 'tax', label: 'Налог', icon: Receipt, types: EXPENSE_TYPES },
  { id: 'percent', label: 'Проценты', icon: Percent, types: ALL_TYPES },
  { id: 'mobile', label: 'Связь', icon: DeviceMobile, types: EXPENSE_TYPES },
  { id: 'phone', label: 'Телефон', icon: Phone, types: EXPENSE_TYPES },
  { id: 'subscriptions', label: 'Подписки', icon: Devices, types: EXPENSE_TYPES },
  { id: 'electronics', label: 'Электроника', icon: Laptop, types: EXPENSE_TYPES },
  { id: 'repairs', label: 'Ремонт', icon: Hammer, types: EXPENSE_TYPES },
  { id: 'cleaning', label: 'Уборка', icon: Broom, types: EXPENSE_TYPES },
  { id: 'washing', label: 'Стиральная машина', icon: WashingMachine, types: EXPENSE_TYPES },
  { id: 'household-chemicals', label: 'Бытовая химия', icon: SprayBottle, types: EXPENSE_TYPES },
  { id: 'clothes', label: 'Одежда', icon: Dress, types: EXPENSE_TYPES },
  { id: 'shoes', label: 'Обувь', icon: Sneaker, types: EXPENSE_TYPES },
  { id: 'beauty', label: 'Красота', icon: Sparkle, types: EXPENSE_TYPES },
  { id: 'shopping', label: 'Покупки', icon: ShoppingBag, types: EXPENSE_TYPES },
  { id: 'accessories', label: 'Аксессуары', icon: Beanie, types: EXPENSE_TYPES },
  { id: 'watch', label: 'Часы', icon: Watch, types: EXPENSE_TYPES },
  { id: 'medicine', label: 'Лекарства', icon: Pill, types: EXPENSE_TYPES },
  { id: 'health', label: 'Здоровье', icon: Hospital, types: EXPENSE_TYPES },
  { id: 'medical', label: 'Медицина', icon: Syringe, types: EXPENSE_TYPES },
  { id: 'psychology', label: 'Психология', icon: Brain, types: EXPENSE_TYPES },
  { id: 'first-aid', label: 'Первая помощь', icon: FirstAidKit, types: EXPENSE_TYPES },
  { id: 'care', label: 'Уход', icon: HandSoap, types: EXPENSE_TYPES },
  { id: 'dentistry', label: 'Стоматология', icon: Tooth, types: EXPENSE_TYPES },
  { id: 'glasses', label: 'Очки', icon: Eyeglasses, types: ALL_TYPES },
  { id: 'movies', label: 'Кино', icon: FilmSlate, types: EXPENSE_TYPES },
  { id: 'games', label: 'Игры', icon: GameController, types: EXPENSE_TYPES },
  { id: 'music', label: 'Музыка', icon: MusicNote, types: EXPENSE_TYPES },
  { id: 'books', label: 'Книги', icon: Books, types: EXPENSE_TYPES },
  { id: 'fitness', label: 'Фитнес', icon: Barbell, types: EXPENSE_TYPES },
  { id: 'sport', label: 'Спорт', icon: SoccerBall, types: EXPENSE_TYPES },
  { id: 'running', label: 'Бег', icon: PersonSimpleRun, types: EXPENSE_TYPES },
  { id: 'campfire', label: 'Костёр', icon: Campfire, types: EXPENSE_TYPES },
  { id: 'smoking', label: 'Курение', icon: Cigarette, types: EXPENSE_TYPES },
  { id: 'pets', label: 'Животные', icon: PawPrint, types: EXPENSE_TYPES },
  { id: 'garden', label: 'Растения', icon: Plant, types: EXPENSE_TYPES },
  { id: 'gifts', label: 'Подарки', icon: Gift, types: EXPENSE_TYPES },
  { id: 'services', label: 'Услуги', icon: Scissors, types: EXPENSE_TYPES },
  { id: 'household', label: 'Для дома', icon: Basket, types: EXPENSE_TYPES },
  { id: 'delivery', label: 'Доставка', icon: Package, types: EXPENSE_TYPES },
  { id: 'parents', label: 'Родители', icon: HandHeart, types: EXPENSE_TYPES },
  { id: 'family', label: 'Семья', icon: UsersThree, types: EXPENSE_TYPES },
  { id: 'people', label: 'Люди', icon: Users, types: ALL_TYPES },
  { id: 'debt-return', label: 'Возврат долга', icon: HandDeposit, types: ALL_TYPES },
  { id: 'work', label: 'Работа', icon: Briefcase, types: INCOME_TYPES },
  { id: 'savings', label: 'Накопления', icon: PiggyBank, types: INCOME_TYPES },
  { id: 'cash', label: 'Наличные', icon: Money, types: INCOME_TYPES },
  { id: 'card', label: 'На карту', icon: CreditCard, types: INCOME_TYPES },
  { id: 'investments', label: 'Инвестиции', icon: ChartLineUp, types: INCOME_TYPES },
  { id: 'bank', label: 'Банк', icon: Bank, types: INCOME_TYPES },
  { id: 'partnership', label: 'Партнёрство', icon: Handshake, types: INCOME_TYPES },
  { id: 'education', label: 'Обучение', icon: GraduationCap, types: INCOME_TYPES },
  { id: 'salary', label: 'Зарплата', icon: User, types: INCOME_TYPES },
  { id: 'business', label: 'Бизнес', icon: Buildings, types: INCOME_TYPES },
  { id: 'coins', label: 'Монеты', icon: Coins, types: ALL_TYPES },
  { id: 'debts', label: 'Долги', icon: HandWithdraw, types: INCOME_TYPES },
  { id: 'cashback', label: 'Кэшбэк', icon: HandCoins, types: INCOME_TYPES },
  { id: 'interest', label: 'Процентная ставка', icon: SealPercent, types: INCOME_TYPES },
  { id: 'rent', label: 'Аренда', icon: HouseLine, types: INCOME_TYPES },
  { id: 'startup', label: 'Проект', icon: Rocket, types: INCOME_TYPES },
  { id: 'bonus', label: 'Премия', icon: Target, types: INCOME_TYPES },
  { id: 'events', label: 'События', icon: Ticket, types: INCOME_TYPES },
  { id: 'gift-income', label: 'Подарок', icon: Gift, types: INCOME_TYPES },
  { id: 'award', label: 'Награда', icon: Trophy, types: INCOME_TYPES },
] as const

const presetsById = new Map(CATEGORY_ICON_PRESETS.map((preset) => [preset.id, preset]))
const iconColorIds = new Set<AccountIconColorId>(
  ACCOUNT_ICON_COLORS.map((color) => color.id),
)

const legacyIconPresets: Record<string, string> = {
  '🛒': 'groceries',
  '🍔': 'fast-food',
  '🍕': 'pizza',
  '☕': 'cafe',
  '🍺': 'drinks',
  '🍽️': 'restaurants',
  '🚗': 'car',
  '⛽': 'fuel',
  '🚌': 'bus',
  '✈️': 'travel',
  '🚕': 'taxi',
  '🚂': 'train',
  '🏠': 'home',
  '💡': 'utilities',
  '📱': 'mobile',
  '💻': 'electronics',
  '🛠️': 'repairs',
  '🧹': 'cleaning',
  '👗': 'clothes',
  '👟': 'shoes',
  '💄': 'beauty',
  '🛍️': 'shopping',
  '👒': 'accessories',
  '⌚': 'watch',
  '💊': 'medicine',
  '🏥': 'health',
  '💉': 'medical',
  '🧴': 'care',
  '🦷': 'dentistry',
  '👓': 'glasses',
  '🎬': 'movies',
  '🎮': 'games',
  '🎵': 'music',
  '📚': 'books',
  '🏋️': 'fitness',
  '⚽': 'sport',
  '🐾': 'pets',
  '🌿': 'garden',
  '🎁': 'gifts',
  '✂️': 'services',
  '🧺': 'household',
  '📦': 'delivery',
  '💼': 'work',
  '💰': 'savings',
  '💵': 'cash',
  '💳': 'card',
  '📈': 'investments',
  '🏦': 'bank',
  '🤝': 'partnership',
  '🎓': 'education',
  '👔': 'salary',
  '🏢': 'business',
  '💹': 'investments',
  '🪙': 'coins',
  '🏡': 'rent',
  '🚀': 'startup',
  '🎯': 'bonus',
  '🎪': 'events',
  '🏆': 'award',
}

const DEFAULT_CATEGORY_PRESETS: Record<CategoryType, string> = {
  expense: 'groceries',
  income: 'work',
}

interface ResolvedCategoryIcon extends AccountIconAppearance {
  preset: CategoryIconPreset
}

function presetValue(id: string): string {
  return `${PRESET_PREFIX}${id}`
}

function serializeCategoryIcon(
  baseValue: string,
  foreground: AccountIconColorId,
  border: AccountIconBorderColorId,
): string {
  if (foreground === DEFAULT_FOREGROUND_COLOR && border === DEFAULT_BORDER_COLOR) {
    return baseValue
  }

  return [baseValue, foreground, border].join(APPEARANCE_SEPARATOR)
}

function resolveCategoryIcon(
  value?: string | null,
  type?: CategoryType,
): ResolvedCategoryIcon {
  const [baseValue = '', foregroundValue, borderValue] = (value ?? '').split(
    APPEARANCE_SEPARATOR,
    3,
  )
  const foregroundCandidate = foregroundValue === 'teal' ? 'yellow' : foregroundValue
  const borderCandidate = borderValue === 'teal' ? 'yellow' : borderValue
  const foreground = iconColorIds.has(foregroundCandidate as AccountIconColorId)
    ? foregroundCandidate as AccountIconColorId
    : DEFAULT_FOREGROUND_COLOR
  const border = borderCandidate === 'none' || iconColorIds.has(borderCandidate as AccountIconColorId)
    ? borderCandidate as AccountIconBorderColorId
    : DEFAULT_BORDER_COLOR

  const storedPresetId = baseValue.startsWith(PRESET_PREFIX)
    ? baseValue.slice(PRESET_PREFIX.length)
    : baseValue === '🎁' && type === 'income'
      ? 'gift-income'
      : legacyIconPresets[baseValue]
  const fallbackPresetId = type ? DEFAULT_CATEGORY_PRESETS[type] : 'other'
  const preset = presetsById.get(storedPresetId) ?? presetsById.get(fallbackPresetId)!

  return { preset, foreground, border }
}

function replaceCategoryIconBase(value: string, presetId: string): string {
  const resolved = resolveCategoryIcon(value)
  return serializeCategoryIcon(
    presetValue(presetId),
    resolved.foreground,
    resolved.border,
  )
}

export function defaultCategoryIconValue(type: CategoryType): string {
  return presetValue(DEFAULT_CATEGORY_PRESETS[type])
}

export function normalizeCategoryIconValue(
  value?: string | null,
  type?: CategoryType,
): string {
  const resolved = resolveCategoryIcon(value, type)
  return serializeCategoryIcon(
    presetValue(resolved.preset.id),
    resolved.foreground,
    resolved.border,
  )
}

export function updateCategoryIconAppearance(
  value: string,
  appearance: Partial<AccountIconAppearance>,
): string {
  const resolved = resolveCategoryIcon(value)
  return serializeCategoryIcon(
    presetValue(resolved.preset.id),
    appearance.foreground ?? resolved.foreground,
    appearance.border ?? resolved.border,
  )
}

export function CategoryIcon({
  value,
  type,
  size = 44,
  framed = true,
  shape = 'square',
}: {
  value?: string | null
  type?: CategoryType
  size?: number
  framed?: boolean
  shape?: AccountIconShape
}) {
  const resolved = resolveCategoryIcon(value, type)
  const PresetIcon = resolved.preset.icon
  const className = [
    'account-icon',
    framed ? '' : 'account-icon--unframed',
    shape === 'rectangle' ? 'account-icon--rectangle' : '',
  ].filter(Boolean).join(' ')

  return (
    <span
      className={className}
      style={accountIconStyle(resolved, size, shape)}
      role="img"
      aria-label={resolved.preset.label}
    >
      <PresetIcon size={Math.round(size * 0.58)} weight="regular" aria-hidden="true" />
    </span>
  )
}

export function CategoryIconPicker({
  value,
  type,
  onChange,
}: {
  value: string
  type: CategoryType
  onChange: (value: string) => void
}) {
  const resolved = resolveCategoryIcon(value, type)
  const titleId = useId()
  const availablePresets = CATEGORY_ICON_PRESETS.filter((preset) => preset.types.includes(type))

  return (
    <section
      className="account-icon-picker account-icon-picker--category"
      aria-labelledby={titleId}
    >
      <div className="account-icon-picker__header">
        <h2 id={titleId}>Иконка категории</h2>
        <p>Выберите подходящую и настройте оформление</p>
      </div>

      <div className="account-icon-picker__grid">
        {availablePresets.map((preset) => {
          const optionValue = replaceCategoryIconBase(value, preset.id)

          return (
            <button
              className="account-icon-option category-icon-option"
              type="button"
              key={preset.id}
              aria-label={`Иконка «${preset.label}»`}
              aria-pressed={resolved.preset.id === preset.id}
              title={preset.label}
              onClick={() => onChange(optionValue)}
            >
              <CategoryIcon value={optionValue} type={type} size={36} />
            </button>
          )
        })}
      </div>

      <IconAppearanceControls
        foreground={resolved.foreground}
        border={resolved.border}
        onForegroundChange={(foreground) => onChange(updateCategoryIconAppearance(
          value,
          { foreground },
        ))}
        onBorderChange={(border) => onChange(updateCategoryIconAppearance(value, { border }))}
      />
    </section>
  )
}
