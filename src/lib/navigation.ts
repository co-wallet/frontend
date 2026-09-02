export function isMenuPathActive(
  pathname: string,
  itemPath: string,
  exact = false,
): boolean {
  if (pathname === itemPath) return true
  return !exact && pathname.startsWith(`${itemPath}/`)
}
