/** Parse a decimal string that may use comma or period as separator. */
export function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0
}

/** Strip any characters that are not digits or a single decimal separator (.,).
 *  Limits the fractional part to maxDecimals digits (default 4). */
export function filterDecimalInput(value: string, maxDecimals = 4): string {
  let filtered = value.replace(/[^0-9.,]/g, '')
  const sepIdx = filtered.search(/[.,]/)
  if (sepIdx !== -1) {
    const intPart = filtered.slice(0, sepIdx + 1)
    const decPart = filtered.slice(sepIdx + 1).replace(/[.,]/g, '').slice(0, maxDecimals)
    filtered = intPart + decPart
  }
  return filtered
}

/** Decimal input that additionally preserves one leading minus sign. */
export function filterSignedDecimalInput(value: string, maxDecimals = 4): string {
  const negative = value.trimStart().startsWith('-')
  const unsigned = filterDecimalInput(value, maxDecimals)
  if (!negative) return unsigned
  return unsigned === '' ? '-' : `-${unsigned}`
}

/** Toggle a decimal input between positive and negative while keeping it editable. */
export function toggleDecimalSign(value: string): string {
  if (value.startsWith('-')) {
    return value.slice(1) || '0'
  }
  return value === '' || value === '0' ? '-' : `-${value}`
}

/** Returns true only if value is a finite number (not empty, not just a separator). */
export function isValidDecimal(value: string): boolean {
  if (!value) return false
  const n = parseFloat(value.replace(',', '.'))
  return !isNaN(n) && isFinite(n)
}
