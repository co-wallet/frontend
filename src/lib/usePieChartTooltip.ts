import { useEffect, useState } from 'react'
import { useChartTooltipTrigger } from './useChartTooltipTrigger'

export function usePieChartTooltip() {
  const trigger = useChartTooltipTrigger()
  const [active, setActive] = useState(false)
  const [activeSector, setActiveSector] = useState<string | null>(null)

  useEffect(() => {
    if (trigger !== 'click') return

    // Capture закрывает старую подсказку до того, как тап по сектору откроет новую.
    const dismiss = () => {
      setActive(false)
      setActiveSector(null)
    }
    document.addEventListener('click', dismiss, true)
    return () => document.removeEventListener('click', dismiss, true)
  }, [trigger])

  return {
    trigger,
    active: trigger === 'click' ? active : undefined,
    onSectorClick: () => {
      if (trigger === 'click') setActive(true)
    },
    onNavigableSectorClick: (sector: string, navigate: () => void) => {
      if (trigger !== 'click') {
        navigate()
        return
      }
      if (active && activeSector === sector) {
        setActive(false)
        setActiveSector(null)
        navigate()
        return
      }
      setActiveSector(sector)
      setActive(true)
    },
  }
}
