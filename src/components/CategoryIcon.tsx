import { useId } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  Airplane,
  Armchair,
  Baby,
  BabyCarriage,
  Bank,
  Barbell,
  Basket,
  Basketball,
  Beanie,
  BeerBottle,
  BeerStein,
  Boat,
  BookOpen,
  Books,
  BowlFood,
  Brain,
  Briefcase,
  Broom,
  Buildings,
  Bus,
  Calculator,
  Campfire,
  Camera,
  Car,
  Cat,
  ChartLineUp,
  ChefHat,
  Cigarette,
  CoatHanger,
  Coffee,
  Coins,
  CookingPot,
  Couch,
  CreditCard,
  Cpu,
  DeviceMobile,
  Devices,
  Dress,
  Dog,
  Eyeglasses,
  FilmReel,
  FilmSlate,
  Fish,
  FirstAidKit,
  Flower,
  Football,
  ForkKnife,
  GameController,
  GasPump,
  Gift,
  Globe,
  GraduationCap,
  Guitar,
  Hamburger,
  Hammer,
  HandCoins,
  HandDeposit,
  HandHeart,
  Handshake,
  HandSoap,
  HandWithdraw,
  Heart,
  HighHeel,
  Horse,
  Hospital,
  House,
  HouseLine,
  IceCream,
  Island,
  Laptop,
  Lightning,
  Lightbulb,
  Money,
  Moped,
  Motorcycle,
  MusicNote,
  MusicNotes,
  Martini,
  Oven,
  Package,
  PaintBrush,
  PaintRoller,
  PawPrint,
  Percent,
  PersonSimpleBike,
  PersonSimpleRun,
  PersonSimpleSki,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plant,
  PoliceCar,
  Receipt,
  Rocket,
  SealPercent,
  Scissors,
  Screwdriver,
  ShoppingBag,
  ShoppingCart,
  ShirtFolded,
  Sneaker,
  Smiley,
  SoccerBall,
  Sparkle,
  SprayBottle,
  Storefront,
  Syringe,
  Tag,
  Target,
  Taxi,
  TennisBall,
  Thermometer,
  Ticket,
  Tire,
  Toolbox,
  Tooth,
  Train,
  Trophy,
  TShirt,
  User,
  Users,
  UsersThree,
  WashingMachine,
  Watch,
  Wine,
  Wrench,
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
  { id: 'baby', label: 'Ребёнок', icon: Baby, types: EXPENSE_TYPES },
  { id: 'baby-carriage', label: 'Коляска', icon: BabyCarriage, types: EXPENSE_TYPES },
  { id: 'heart', label: 'Сердце', icon: Heart, types: EXPENSE_TYPES },
  { id: 'armchair', label: 'Кресло', icon: Armchair, types: EXPENSE_TYPES },
  { id: 'couch', label: 'Мебель', icon: Couch, types: EXPENSE_TYPES },
  { id: 'fish', label: 'Рыба', icon: Fish, types: EXPENSE_TYPES },
  { id: 'bowl-food', label: 'Готовая еда', icon: BowlFood, types: EXPENSE_TYPES },
  { id: 'chef', label: 'Повар', icon: ChefHat, types: EXPENSE_TYPES },
  { id: 'oven', label: 'Духовка', icon: Oven, types: EXPENSE_TYPES },
  { id: 'cooking-pot', label: 'Готовка', icon: CookingPot, types: EXPENSE_TYPES },
  { id: 'beer-stein', label: 'Пиво', icon: BeerStein, types: EXPENSE_TYPES },
  { id: 'wine', label: 'Вино', icon: Wine, types: EXPENSE_TYPES },
  { id: 'cocktail', label: 'Коктейли', icon: Martini, types: EXPENSE_TYPES },
  { id: 'ice-cream', label: 'Мороженое', icon: IceCream, types: EXPENSE_TYPES },
  { id: 'film-reel', label: 'Кинотеатр', icon: FilmReel, types: EXPENSE_TYPES },
  { id: 'camera', label: 'Фото', icon: Camera, types: EXPENSE_TYPES },
  { id: 'smiley', label: 'Настроение', icon: Smiley, types: EXPENSE_TYPES },
  { id: 'guitar', label: 'Гитара', icon: Guitar, types: EXPENSE_TYPES },
  { id: 'music-notes', label: 'Музыкальные инструменты', icon: MusicNotes, types: EXPENSE_TYPES },
  { id: 'book-open', label: 'Чтение', icon: BookOpen, types: EXPENSE_TYPES },
  { id: 't-shirt', label: 'Футболка', icon: TShirt, types: EXPENSE_TYPES },
  { id: 'shirt-folded', label: 'Гардероб', icon: ShirtFolded, types: EXPENSE_TYPES },
  { id: 'coat-hanger', label: 'Верхняя одежда', icon: CoatHanger, types: EXPENSE_TYPES },
  { id: 'high-heel', label: 'Туфли', icon: HighHeel, types: EXPENSE_TYPES },
  { id: 'flower', label: 'Цветы', icon: Flower, types: EXPENSE_TYPES },
  { id: 'thermometer', label: 'Температура', icon: Thermometer, types: EXPENSE_TYPES },
  { id: 'horse', label: 'Лошадь', icon: Horse, types: EXPENSE_TYPES },
  { id: 'cat', label: 'Кошка', icon: Cat, types: EXPENSE_TYPES },
  { id: 'dog', label: 'Собака', icon: Dog, types: EXPENSE_TYPES },
  { id: 'boat', label: 'Лодка', icon: Boat, types: EXPENSE_TYPES },
  { id: 'globe', label: 'Интернет', icon: Globe, types: EXPENSE_TYPES },
  { id: 'island', label: 'Отпуск', icon: Island, types: EXPENSE_TYPES },
  { id: 'motorcycle', label: 'Мотоцикл', icon: Motorcycle, types: EXPENSE_TYPES },
  { id: 'moped', label: 'Скутер', icon: Moped, types: EXPENSE_TYPES },
  { id: 'bicycle', label: 'Велосипед', icon: PersonSimpleBike, types: EXPENSE_TYPES },
  { id: 'police', label: 'Штрафы', icon: PoliceCar, types: EXPENSE_TYPES },
  { id: 'tire', label: 'Шины', icon: Tire, types: EXPENSE_TYPES },
  { id: 'basketball', label: 'Баскетбол', icon: Basketball, types: EXPENSE_TYPES },
  { id: 'tennis', label: 'Теннис', icon: TennisBall, types: EXPENSE_TYPES },
  { id: 'football', label: 'Американский футбол', icon: Football, types: EXPENSE_TYPES },
  { id: 'skiing', label: 'Лыжи', icon: PersonSimpleSki, types: EXPENSE_TYPES },
  { id: 'paint-brush', label: 'Покраска', icon: PaintBrush, types: EXPENSE_TYPES },
  { id: 'paint-roller', label: 'Малярные работы', icon: PaintRoller, types: EXPENSE_TYPES },
  { id: 'wrench', label: 'Инструменты', icon: Wrench, types: EXPENSE_TYPES },
  { id: 'screwdriver', label: 'Мелкий ремонт', icon: Screwdriver, types: EXPENSE_TYPES },
  { id: 'toolbox', label: 'Мастерская', icon: Toolbox, types: EXPENSE_TYPES },
  { id: 'storefront', label: 'Магазин', icon: Storefront, types: ALL_TYPES },
  { id: 'calculator', label: 'Расчёты', icon: Calculator, types: ALL_TYPES },
  { id: 'cpu', label: 'Комплектующие', icon: Cpu, types: EXPENSE_TYPES },
  { id: 'lightning', label: 'Электричество', icon: Lightning, types: EXPENSE_TYPES },
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
const CATEGORY_ICON_COLOR_CYCLE: readonly AccountIconColorId[] = [
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'green',
  'yellow',
  'graphite',
]
const presetColorsById = new Map(
  CATEGORY_ICON_PRESETS.map((preset, index) => [
    preset.id,
    CATEGORY_ICON_COLOR_CYCLE[index % CATEGORY_ICON_COLOR_CYCLE.length],
  ]),
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

function presetDefaultColor(id: string): AccountIconColorId {
  return presetColorsById.get(id) ?? DEFAULT_FOREGROUND_COLOR
}

function serializeCategoryIcon(
  baseValue: string,
  foreground: AccountIconColorId,
  border: AccountIconBorderColorId,
): string {
  const presetId = baseValue.startsWith(PRESET_PREFIX)
    ? baseValue.slice(PRESET_PREFIX.length)
    : ''
  const defaultColor = presetDefaultColor(presetId)

  if (foreground === defaultColor && border === defaultColor) {
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
  const storedPresetId = baseValue.startsWith(PRESET_PREFIX)
    ? baseValue.slice(PRESET_PREFIX.length)
    : baseValue === '🎁' && type === 'income'
      ? 'gift-income'
      : legacyIconPresets[baseValue]
  const fallbackPresetId = type ? DEFAULT_CATEGORY_PRESETS[type] : 'other'
  const preset = presetsById.get(storedPresetId) ?? presetsById.get(fallbackPresetId)!
  const defaultColor = presetDefaultColor(preset.id)
  const foregroundCandidate = foregroundValue === 'teal' ? 'yellow' : foregroundValue
  const borderCandidate = borderValue === 'teal' ? 'yellow' : borderValue
  const foreground = iconColorIds.has(foregroundCandidate as AccountIconColorId)
    ? foregroundCandidate as AccountIconColorId
    : defaultColor
  const border = borderCandidate === 'none' || iconColorIds.has(borderCandidate as AccountIconColorId)
    ? borderCandidate as AccountIconBorderColorId
    : defaultColor

  return { preset, foreground, border }
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
          const selected = resolved.preset.id === preset.id
          const optionValue = selected
            ? normalizeCategoryIconValue(value, type)
            : presetValue(preset.id)

          return (
            <button
              className="account-icon-option category-icon-option"
              type="button"
              key={preset.id}
              aria-label={`Иконка «${preset.label}»`}
              aria-pressed={selected}
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
