import { useState, useEffect } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import { categoriesApi, type CategoryNode } from '@/api/categories'
import { tagsApi } from '@/api/tags'
import { type TransactionFilter } from '@/api/transactions'

interface FilterSheetProps {
  value: TransactionFilter
  onChange: (f: TransactionFilter) => void
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = []
  function walk(items: CategoryNode[]) {
    for (const n of items) {
      result.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return result
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

const PAGE_SIZE = 5

export function FilterSheet({ value, onChange }: FilterSheetProps) {
  const [open, setOpen] = useState(false)

  // Local draft state — applied only on "Применить"
  const [accountIds, setAccountIds] = useState<string[]>(value.accountIds ?? [])
  const [categoryIds, setCategoryIds] = useState<string[]>(value.categoryIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(value.tagIds ?? [])
  const [tagMode, setTagMode] = useState<'or' | 'and'>(value.tagMode ?? 'or')
  const [dateFrom, setDateFrom] = useState(value.dateFrom ?? '')
  const [dateTo, setDateTo] = useState(value.dateTo ?? '')

  // Visible counts for collapsible lists
  const [accountsVisible, setAccountsVisible] = useState(PAGE_SIZE)
  const [categoriesVisible, setCategoriesVisible] = useState(PAGE_SIZE)
  const [tagsVisible, setTagsVisible] = useState(PAGE_SIZE)

  // Sync draft when sheet opens
  useEffect(() => {
    if (open) {
      setAccountIds(value.accountIds ?? [])
      setCategoryIds(value.categoryIds ?? [])
      setTagIds(value.tagIds ?? [])
      setTagMode(value.tagMode ?? 'or')
      setDateFrom(value.dateFrom ?? '')
      setDateTo(value.dateTo ?? '')
      setAccountsVisible(PAGE_SIZE)
      setCategoriesVisible(PAGE_SIZE)
      setTagsVisible(PAGE_SIZE)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list() })
  const { data: expenseTree = [] } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesApi.list('expense'),
  })
  const { data: incomeTree = [] } = useQuery({
    queryKey: ['categories', 'income'],
    queryFn: () => categoriesApi.list('income'),
  })
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })

  const allCategories = [
    ...flattenCategories(expenseTree).map((c) => ({ ...c, typeLabel: 'Расходы' })),
    ...flattenCategories(incomeTree).map((c) => ({ ...c, typeLabel: 'Доходы' })),
  ]

  function apply() {
    const f: TransactionFilter = {}
    if (accountIds.length) f.accountIds = accountIds
    if (categoryIds.length) f.categoryIds = categoryIds
    if (tagIds.length) { f.tagIds = tagIds; f.tagMode = tagMode }
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo
    onChange(f)
    setOpen(false)
  }

  function reset() {
    setAccountIds([])
    setCategoryIds([])
    setTagIds([])
    setTagMode('or')
    setDateFrom('')
    setDateTo('')
    onChange({})
    setOpen(false)
  }

  const activeCount = [
    (value.accountIds?.length ?? 0) > 0,
    (value.categoryIds?.length ?? 0) > 0,
    (value.tagIds?.length ?? 0) > 0,
    !!value.dateFrom || !!value.dateTo,
  ].filter(Boolean).length

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
          activeCount > 0
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card border-border text-foreground hover:bg-muted'
        }`}
      >
        <SlidersHorizontal size={14} />
        Фильтры
        {activeCount > 0 && (
          <span className="ml-0.5 bg-primary-foreground text-primary rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-xl transition-transform duration-300 max-h-[85vh] flex flex-col ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0">
          <h2 className="font-semibold text-base">Фильтры</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6">
          {/* Date range */}
          <section>
            <h3 className="text-sm font-medium mb-2">Период</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">С</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">По</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* Accounts */}
          {accounts.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2">Счета</h3>
              <div className="flex flex-wrap gap-2">
                {accounts.slice(0, accountsVisible).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccountIds((prev) => toggle(prev, a.id))}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      accountIds.includes(a.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {a.icon ? `${a.icon} ` : ''}{a.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-3">
                {accountsVisible < accounts.length && (
                  <button
                    type="button"
                    onClick={() => setAccountsVisible((n) => n + PAGE_SIZE)}
                    className="text-xs text-primary hover:underline"
                  >
                    Показать ещё ({accounts.length - accountsVisible})
                  </button>
                )}
                {accountsVisible > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setAccountsVisible(PAGE_SIZE)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Свернуть
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Categories */}
          {allCategories.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2">Категории</h3>
              <div className="flex flex-wrap gap-2">
                {allCategories.slice(0, categoriesVisible).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryIds((prev) => toggle(prev, c.id))}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      categoryIds.includes(c.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-3">
                {categoriesVisible < allCategories.length && (
                  <button
                    type="button"
                    onClick={() => setCategoriesVisible((n) => n + PAGE_SIZE)}
                    className="text-xs text-primary hover:underline"
                  >
                    Показать ещё ({allCategories.length - categoriesVisible})
                  </button>
                )}
                {categoriesVisible > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setCategoriesVisible(PAGE_SIZE)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Свернуть
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Теги</h3>
                <div className="flex gap-1 bg-muted rounded-md p-0.5">
                  {(['or', 'and'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTagMode(m)}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${
                        tagMode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, tagsVisible).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTagIds((prev) => toggle(prev, t.id))}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      tagIds.includes(t.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-3">
                {tagsVisible < tags.length && (
                  <button
                    type="button"
                    onClick={() => setTagsVisible((n) => n + PAGE_SIZE)}
                    className="text-xs text-primary hover:underline"
                  >
                    Показать ещё ({tags.length - tagsVisible})
                  </button>
                )}
                {tagsVisible > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setTagsVisible(PAGE_SIZE)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Свернуть
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-4 border-t flex-shrink-0">
          <button
            onClick={reset}
            className="flex-1 rounded-md border py-2.5 text-sm font-medium hover:bg-muted"
          >
            Сбросить
          </button>
          <button
            onClick={apply}
            className="flex-1 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium"
          >
            Применить
          </button>
        </div>
      </div>
    </>
  )
}
