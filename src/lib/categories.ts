import type { CategoryNode } from '@/api/categories'

export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = []

  function walk(items: CategoryNode[]) {
    for (const item of items) {
      result.push(item)
      if (item.children?.length) walk(item.children)
    }
  }

  walk(nodes)
  return result
}
