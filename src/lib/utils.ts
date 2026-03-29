import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse a decimal string that may use comma or period as separator. */
export function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0
}

/** Strip any characters that are not digits or a single decimal separator (.,). */
export function filterDecimalInput(value: string): string {
  let filtered = value.replace(/[^0-9.,]/g, '')
  // Keep only the first decimal separator
  const sepIdx = filtered.search(/[.,]/)
  if (sepIdx !== -1) {
    filtered = filtered.slice(0, sepIdx + 1) + filtered.slice(sepIdx + 1).replace(/[.,]/g, '')
  }
  return filtered
}

/** Returns true only if value is a finite number (not empty, not just a separator). */
export function isValidDecimal(value: string): boolean {
  if (!value) return false
  const n = parseFloat(value.replace(',', '.'))
  return !isNaN(n) && isFinite(n)
}
