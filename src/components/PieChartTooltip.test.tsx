import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PieChartTooltip } from './PieChartTooltip'

const formatAmount = (amount: number) => `${amount.toFixed(2)} RUB`

describe('PieChartTooltip', () => {
  it.each(['Личный счёт', 'Продукты', 'Зарплата', 'Без категории', 'Очень длинное название категории без сокращения'])('shows the full legend label %s and formatted amount', (name) => {
    const markup = renderToStaticMarkup(<PieChartTooltip active payload={[{ name, value: 123.45 }]} formatAmount={formatAmount} />)
    expect(markup).toContain('role="tooltip"')
    expect(markup).toContain(name)
    expect(markup).toContain('123.45 RUB')
  })

  it.each([-123.45, 0, 123.45])('preserves the original signed amount %s', (amount) => {
    const markup = renderToStaticMarkup(<PieChartTooltip active payload={[{ name: 'Счёт', value: Math.abs(amount), payload: { amount } }]} formatAmount={formatAmount} />)
    expect(markup).toContain(formatAmount(amount))
  })

  it('hides when inactive or without a hovered segment', () => {
    expect(renderToStaticMarkup(<PieChartTooltip active={false} payload={[{ name: 'Счёт', value: 10 }]} formatAmount={formatAmount} />)).toBe('')
    expect(renderToStaticMarkup(<PieChartTooltip active payload={[]} formatAmount={formatAmount} />)).toBe('')
    expect(renderToStaticMarkup(<PieChartTooltip active formatAmount={formatAmount} />)).toBe('')
  })

  it('uses theme colors for both the label and amount', () => {
    const markup = renderToStaticMarkup(<PieChartTooltip active payload={[{ name: 'Счёт', value: 10, color: '#ff0000' }]} contentStyle={{ color: '#eeeeee', backgroundColor: '#111111' }} formatAmount={formatAmount} />)
    expect(markup).toContain('color:#eeeeee')
    expect(markup).toContain('background-color:#111111')
    expect(markup).not.toContain('#ff0000')
  })
})
