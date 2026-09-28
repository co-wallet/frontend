import { useEffect, useRef, useState } from 'react'
import { useChartTooltipTrigger } from './useChartTooltipTrigger'

export function usePieChartTooltip() {
  const trigger = useChartTooltipTrigger()
  const [active, setActive] = useState(false)
  const navigation = useRef({
    activeSector: null as string | null,
    dismissTimer: null as ReturnType<typeof setTimeout> | null,
  })

  const cancelScheduledDismiss = () => {
    if (navigation.current.dismissTimer === null) return
    clearTimeout(navigation.current.dismissTimer)
    navigation.current.dismissTimer = null
  }

  useEffect(() => {
    if (trigger !== 'click') return

    // Capture закрывает старую подсказку до того, как тап по сектору откроет новую.
    // Сектор очищается только после завершения текущего события: Recharts может
    // вызвать свой обработчик после React re-render или microtask.
    const dismiss = () => {
      cancelScheduledDismiss()
      setActive(false)
      navigation.current.dismissTimer = setTimeout(() => {
        navigation.current.activeSector = null
        navigation.current.dismissTimer = null
      }, 0)
    }
    document.addEventListener('click', dismiss, true)
    return () => {
      document.removeEventListener('click', dismiss, true)
      cancelScheduledDismiss()
    }
  }, [trigger])

  return {
    trigger,
    active: trigger === 'click' ? active : undefined,
    onSectorClick: () => {
      if (trigger === 'click') {
        cancelScheduledDismiss()
        navigation.current.activeSector = null
        setActive(true)
      }
    },
    onNavigableSectorClick: (sector: string, navigate: () => void) => {
      if (trigger !== 'click') {
        navigate()
        return
      }
      cancelScheduledDismiss()
      if (navigation.current.activeSector === sector) {
        navigation.current.activeSector = null
        setActive(false)
        navigate()
        return
      }
      navigation.current.activeSector = sector
      setActive(true)
    },
  }
}
