import type { TooltipProps } from 'recharts'

type Props = Pick<TooltipProps<number, string>, 'active' | 'payload' | 'contentStyle'> & {
  formatAmount: (amount: number) => string
}

export function PieChartTooltip({ active, payload, contentStyle, formatAmount }: Props) {
  const entry = payload?.[0]
  if (!active || !entry) return null

  // У баланса размер сектора абсолютный, но в подсказке сохраняется знак суммы.
  const amount = typeof entry.payload?.amount === 'number' ? entry.payload.amount : Number(entry.value)

  return (
    <div role="tooltip" style={{ ...contentStyle, padding: '10px 12px', maxWidth: 260, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{entry.name}</div>
      <div>{formatAmount(amount)}</div>
    </div>
  )
}
