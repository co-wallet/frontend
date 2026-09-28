import { useEffect, useRef, useState } from 'react'
import { useChartTooltipTrigger } from './useChartTooltipTrigger'

export function usePieChartTooltip() {
  const trigger = useChartTooltipTrigger()
  const [active, setActive] = useState(false)
  const navigation = useRef({
    activeSector: null as string | null,
    capturedSector: null as string | null,
  })

  useEffect(() => {
    if (trigger !== 'click') return

    // Capture закрывает старую подсказку до того, как тап по сектору откроет новую.
    // Сектор сохраняется до конца текущего события: React может успеть перерендерить
    // компонент между document capture и обработчиком Recharts.
    const dismiss = () => {
      navigation.current.capturedSector = navigation.current.activeSector
      navigation.current.activeSector = null
      setActive(false)
      queueMicrotask(() => {
        navigation.current.capturedSector = null
      })
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
      if (navigation.current.capturedSector === sector) {
        navigation.current.capturedSector = null
        navigation.current.activeSector = null
        setActive(false)
        navigate()
        return
      }
      navigation.current.capturedSector = null
      navigation.current.activeSector = sector
      setActive(true)
    },
  }
}
