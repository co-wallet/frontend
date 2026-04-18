import { useIsDark } from '@/store/themeStore'

export function useChartTheme() {
  const isDark = useIsDark()

  return {
    tooltipStyle: {
      backgroundColor: isDark ? '#16213e' : '#ffffff',
      border: `1px solid ${isDark ? '#2a2a4a' : '#e5e7eb'}`,
      borderRadius: '8px',
      color: isDark ? '#e5e7eb' : '#1f2937',
    },
    labelColor: isDark ? '#e5e7eb' : '#1f2937',
    gridColor: isDark ? '#2a2a4a' : '#e5e7eb',
    legendColor: isDark ? '#9ca3af' : '#6b7280',
  }
}
