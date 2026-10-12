export function moveAccount<T>(accounts: readonly T[], from: number, to: number): T[] {
  const result = [...accounts]
  if (from === to || from < 0 || to < 0 || from >= result.length || to >= result.length) return result
  const [account] = result.splice(from, 1)
  result.splice(to, 0, account)
  return result
}

export function applyAccountOrder<T extends { id: string }>(accounts: T[], accountIds: string[]): T[] {
  const positions = new Map(accountIds.map((id, index) => [id, index]))
  return [...accounts].sort((a, b) =>
    (positions.get(a.id) ?? accountIds.length) - (positions.get(b.id) ?? accountIds.length))
}
