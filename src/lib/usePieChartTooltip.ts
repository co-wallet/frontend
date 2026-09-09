import { useEffect, useState } from 'react'
import { useChartTooltipTrigger } from './useChartTooltipTrigger'

export function usePieChartTooltip() {
  const trigger = useChartTooltipTrigger()
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (trigger !== 'click') return

    // Capture закрывает старую подсказку до того, как тап по сектору откроет новую.
    const dismiss = () => setActive(false)
    document.addEventListener('click', dismiss, true)
    return () => document.removeEventListener('click', dismiss, true)
  }, [trigger])

  return {
    trigger,
    active: trigger === 'click' ? active : undefined,
    onSectorClick: () => {
      if (trigger === 'click') setActive(true)
    },
  }
}
