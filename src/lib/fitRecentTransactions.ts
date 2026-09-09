/** Keep complete rows, including their date heading, within the available card height. */
export function fitRecentTransactions(available: number, header: number, footer: number, rows: number[]): number {
  let used = header + footer
  let count = 0
  for (const height of rows) {
    if (used + height > available) break
    used += height
    count++
  }
  return count
}
