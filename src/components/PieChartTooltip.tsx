import type { TooltipProps } from 'recharts'
import type { CategoryType } from '@/api/categories'
import { AccountIcon } from './AccountIcon'
import { CategoryIcon } from './CategoryIcon'

type Props = Pick<TooltipProps<number, string>, 'active' | 'payload' | 'contentStyle'> & {
  formatAmount: (amount: number) => string
  categoryType?: CategoryType
}

export function PieChartTooltip({ active, payload, contentStyle, formatAmount, categoryType }: Props) {
  const entry = payload?.[0]
  if (!active || !entry) return null

  // У баланса размер сектора абсолютный, но в подсказке сохраняется знак суммы.
  const amount = typeof entry.payload?.amount === 'number' ? entry.payload.amount : Number(entry.value)

  return (
    <div role="tooltip" style={{ ...contentStyle, padding: '10px 12px', maxWidth: 260, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 4 }}>
        {entry.payload?.iconType === 'tag' ? (
          <span aria-hidden="true">#</span>
        ) : entry.payload?.iconType === 'account' ? (
          <AccountIcon value={entry.payload.icon} size={20} shape="rectangle" />
        ) : (
          <CategoryIcon
            value={entry.payload?.icon}
            type={entry.payload?.categoryType ?? categoryType}
            size={20}
            ariaLabel={entry.payload?.categoryId === 'uncategorized' ? 'Без категории' : undefined}
          />
        )}
        <span style={{ minWidth: 0 }}>{entry.name}</span>
      </div>
      <div>{formatAmount(amount)}</div>
    </div>
  )
}
