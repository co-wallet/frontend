import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MonefyImport, canConfirmImport } from './monefyImport'
import type { ImportPreview } from '@/api/monefy'

vi.mock('@/api/monefy', () => ({ monefyApi: {} }))
export const preview: ImportPreview = {
  preview_id: 'preview-1', expires_at: '2099-01-01T00:00:00Z', can_confirm: true,
  requires_exclusion_confirmation: true, counts: { accounts: 1, categories: 1, transactions: 2, transfers: 1 },
  period_from: '2020-01-01', period_to: '2025-01-01', currencies: ['RUB'],
  accounts: [{ source_id: 'a', icon: 'preset:cash|green|green', name: 'Семья', currency: 'RUB', kind: 'spending', initial_balance: '100.0001', initial_balance_date: '2020-01-01', final_balance: '50.0001', source_included_in_total: false, source_disabled_at: '2025-01-01' }],
  categories: [{ source_id: 'c', existing_id: 'existing', name: 'Еда', type: 'expense', icon: 'preset:groceries', source_disabled_at: null }],
  diagnostics: [{ severity: 'warning', code: 'flags', entity: '', source_id: '', message: 'Флаги не переносятся' }],
  exclusions: [{ entity: 'Transaction', source_id: 't', reason: 'Удалённый счёт' }], deleted: { Account: 1 },
}
const result = { preview_id: 'preview-1', accounts: 1, categories: 0, reused_categories: 1, transactions: 2, transfers: 1, completed_at: '2026-09-09' }
const file = { name: 'backup.db', size: 100 } as File
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
function setup() {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, v: string) => { values.set(key, v) }, removeItem: (key: string) => { values.delete(key) } }
  const api = { availability: vi.fn().mockResolvedValue({ available: true, reasons: [] }), preview: vi.fn().mockResolvedValue(structuredClone(preview)), configure: vi.fn().mockResolvedValue({ ...preview, preview_id: 'preview-2' }), confirm: vi.fn().mockResolvedValue(result) }
  const success = vi.fn()
  return { api, storage, success, model: new MonefyImport('u', api, storage, success) }
}
describe('MonefyImport public workflow', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires exclusion acceptance and imports exactly once, notifying query invalidation', async () => {
    const { model, api, success } = setup()
    await model.upload(file)
    await model.confirm()
    expect(api.confirm).not.toHaveBeenCalled()
    model.accept(true)
    await Promise.all([model.confirm(), model.confirm()])
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith('preview-1', true, false)
    expect(model.getSnapshot().result).toEqual(result)
    expect(success).toHaveBeenCalledOnce()
  })
  it('confirms default account types without configuring options', async () => {
    const { model, api } = setup()
    api.preview.mockResolvedValue({ ...preview, requires_exclusion_confirmation: false, exclusions: [] })
    await model.upload(file)
    expect(canConfirmImport(model.getSnapshot())).toBe(true)
    await model.confirm()
    expect(api.configure).not.toHaveBeenCalled()
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith('preview-1', false, false)
  })
  it('overrides one account and preserves other defaults and category icons through confirmation', async () => {
    const { model, api } = setup()
    const initial = { ...preview, accounts: [preview.accounts[0], { ...preview.accounts[0], source_id: 'b' }], categories: [{ ...preview.categories[0], existing_id: undefined }] }
    api.preview.mockResolvedValue(initial)
    api.configure.mockImplementation(async (id, kinds, icons) => ({ ...initial, preview_id: `${id}-next`, accounts: initial.accounts.map(a => ({ ...a, kind: kinds[a.source_id] })), categories: initial.categories.map(c => ({ ...c, icon: icons[c.source_id] })) }))
    await model.upload(file)
    await model.configureCategory('c', 'preset:groceries|purple|none')
    await model.configure('b', 'deposit')
    expect(api.configure).toHaveBeenLastCalledWith('preview-1-next', { a: 'spending', b: 'deposit' }, { c: 'preset:groceries|purple|none' }, { a: 'preset:cash|green|green', b: 'preset:cash|green|green' })
    expect(model.getSnapshot().preview?.accounts.map(a => a.kind)).toEqual(['spending', 'deposit'])
    expect(model.getSnapshot().preview?.categories[0].icon).toBe('preset:groceries|purple|none')
    model.accept(true)
    await model.confirm()
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith('preview-1-next-next', true, false)
  })
  it('preserves manual account appearance and generated colors through other options and confirmation', async () => {
    const { model, api } = setup()
    let current = structuredClone(preview)
    current.categories[0].existing_id = undefined
    api.preview.mockResolvedValue(current)
    api.configure.mockImplementation(async (id, kinds, categories, accounts) => {
      current = { ...current, preview_id: `${id}-next`,
        accounts: current.accounts.map(a => ({ ...a, icon: accounts[a.source_id], kind: kinds[a.source_id] })),
        categories: current.categories.map(c => ({ ...c, icon: categories[c.source_id] })),
      }
      return current
    })
    await model.upload(file)
    await model.configureAccountIcon('a', 'preset:wallet|pink|none')
    await model.configureCategory('c', 'preset:cafe|yellow|green')
    await model.configure('a', 'deposit')
    expect(current.accounts[0].icon).toBe('preset:wallet|pink|none')
    expect(current.categories[0].icon).toBe('preset:cafe|yellow|green')
    expect(current.accounts[0].initial_balance).toBe(preview.accounts[0].initial_balance)
    expect(current.accounts[0].final_balance).toBe(preview.accounts[0].final_balance)
    model.accept(true)
    await model.confirm()
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith(current.preview_id, true, false)
    expect(preview.accounts[0].icon).toBe('preset:cash|green|green')
  })
  it('blocks nonempty accounts with server reasons', async () => {
    const { model, api } = setup()
    api.availability.mockResolvedValue({ available: false, reasons: ['owned_accounts'] })
    await model.upload(file)
    expect(api.preview).not.toHaveBeenCalled()
    expect(model.getSnapshot().availability?.reasons).toEqual(['owned_accounts'])
  })
  it.each([{ name: 'a.csv', size: 10 }, { name: 'a.db', size: 0 }, { name: 'a.db', size: 65 * 1024 * 1024 }])('rejects invalid file %j', async bad => {
    const { model, api } = setup()
    await model.upload(bad as File)
    expect(api.preview).not.toHaveBeenCalled()
    expect(model.getSnapshot().error).toContain('.db')
  })
  it('blocks errors and expired previews even with accepted exclusions', async () => {
    const { model, api } = setup()
    for (const p of [{ ...preview, can_confirm: false }, { ...preview, expires_at: '2000-01-01' }, { ...preview, diagnostics: [{ severity: 'blocking' }] }]) {
      api.preview.mockResolvedValue(p)
      await model.upload(file); model.accept(true); await model.confirm()
      expect(canConfirmImport(model.getSnapshot())).toBe(false)
    }
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('configures every account with explicit kinds and replaces preview identity', async () => {
    const { model, api } = setup()
    await model.upload(file); model.accept(true)
    const request = deferred<ImportPreview>(); api.configure.mockReturnValue(request.promise)
    const configuring = model.configure('a', 'investment')
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
    expect(model.getSnapshot().accepted).toBe(false)
    request.resolve({ ...preview, preview_id: 'configured' }); await configuring
    expect(api.configure).toHaveBeenCalledWith('preview-1', { a: 'investment' }, {}, { a: 'preset:cash|green|green' })
    model.accept(true); await model.confirm()
    expect(api.confirm).toHaveBeenCalledWith('configured', true, false)
  })
  it('supports legacy previews by collecting kinds for every initially untyped account before sending options', async () => {
    const { model, api } = setup()
    api.preview.mockResolvedValue({ ...preview, can_confirm: false, accounts: [
      { ...preview.accounts[0], source_id: 'first', kind: '' },
      { ...preview.accounts[0], source_id: 'second', kind: '' },
    ] })
    await model.upload(file)
    await model.configure('first', 'deposit')
    expect(api.configure).not.toHaveBeenCalled()
    expect(model.getSnapshot().preview?.accounts[0].kind).toBe('deposit')
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
    await model.configure('second', 'investment')
    expect(api.configure).toHaveBeenCalledExactlyOnceWith('preview-1', { first: 'deposit', second: 'investment' }, {}, { first: 'preset:cash|green|green', second: 'preset:cash|green|green' })
    expect(model.getSnapshot().preview?.preview_id).toBe('preview-2')
  })
  it('preserves category icon choices while collecting account kinds and saves them in options', async () => {
    const { model, api } = setup()
    api.preview.mockResolvedValue({ ...preview, can_confirm: false,
      accounts: [{ ...preview.accounts[0], kind: '' }],
      categories: [{ ...preview.categories[0], existing_id: undefined }],
    })
    await model.upload(file)
    await model.configureCategory('c', 'preset:groceries|purple|none')
    expect(api.configure).not.toHaveBeenCalled()
    expect(model.getSnapshot().preview?.categories[0].icon).toBe('preset:groceries|purple|none')
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
    await model.configure('a', 'deposit')
    expect(api.configure).toHaveBeenCalledExactlyOnceWith('preview-1', { a: 'deposit' }, { c: 'preset:groceries|purple|none' }, { a: 'preset:cash|green|green' })
  })
  it('does not edit icons of reused categories', async () => {
    const { model, api } = setup(); await model.upload(file)
    await model.configureCategory('c', 'preset:work')
    expect(api.configure).not.toHaveBeenCalled()
  })
  it('ignores an old upload after selecting a new file', async () => {
    const { model, api } = setup()
    const old = deferred<ImportPreview>(); api.preview.mockReturnValueOnce(old.promise)
    const uploading = model.upload(file); await Promise.resolve()
    await model.upload({ ...file, name: 'new.db' } as File)
    old.resolve({ ...preview, preview_id: 'stale' }); await uploading
    expect(model.getSnapshot().preview?.preview_id).toBe('preview-1')
    expect(model.getSnapshot().fileName).toBe('new.db')
  })
  it('cancels preparation and ignores late configure responses', async () => {
    const { model, api } = setup(); await model.upload(file)
    const old = deferred<ImportPreview>(); api.configure.mockReturnValue(old.promise)
    const configuring = model.configure('a', 'deposit'); model.cancel()
    old.resolve(preview); await configuring
    expect(model.getSnapshot().preview).toBeUndefined()
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('clears stale preview after failed configuration or upload', async () => {
    const { model, api } = setup(); await model.upload(file)
    api.configure.mockRejectedValue(new Error('offline'))
    await model.configure('a', 'deposit')
    expect(model.getSnapshot().preview).toBeUndefined()
    api.preview.mockRejectedValue(new Error('offline')); await model.upload(file)
    expect(model.getSnapshot().error).toBeTruthy()
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
  })
  it('recovers the same receipt after network failure and page reload; cannot start another import', async () => {
    const { model, api, storage } = setup(); await model.upload(file); model.accept(true)
    api.confirm.mockRejectedValueOnce(new Error('offline'))
    await model.confirm(); expect(model.getSnapshot().phase).toBe('unknown')
    model.cancel(); await model.upload(file)
    expect(api.preview).toHaveBeenCalledOnce()
    const restored = new MonefyImport('u', api, storage)
    expect(restored.getSnapshot().phase).toBe('unknown')
    await restored.recover()
    expect(api.confirm.mock.calls).toEqual([['preview-1', true, false], ['preview-1', true, false]])
    expect(restored.getSnapshot().phase).toBe('done')
    expect(new MonefyImport('another-user', api, storage).getSnapshot().phase).toBe('idle')
  })
  it('handles availability loss at confirmation and invalidates the preview', async () => {
    const { model, api } = setup(); await model.upload(file); model.accept(true)
    api.confirm.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { error: 'account_not_empty' } } })
    api.availability.mockResolvedValue({ available: false, reasons: ['transactions'] })
    await model.confirm()
    expect(model.getSnapshot().preview).toBeUndefined()
    expect(model.getSnapshot().availability?.available).toBe(false)
    expect(model.getSnapshot().error).toContain('больше не пуста')
  })
  it('explains exhausted server storage without offering confirmation', async () => {
    const { model, api } = setup()
    api.preview.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { error: 'preview_storage_full' } } })
    await model.upload(file)
    expect(model.getSnapshot().error).toContain('не хватает места для предпросмотра')
    expect(model.getSnapshot().preview).toBeUndefined()
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
  })
  it('requires a successful server availability check', async () => {
    const { model, api } = setup(); api.availability.mockRejectedValue(new Error())
    await model.check()
    expect(model.getSnapshot().availability).toBeUndefined()
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
    api.availability.mockResolvedValue({ available: true, reasons: [] })
    await model.check()
    expect(model.getSnapshot().availability?.available).toBe(true)
    expect(model.getSnapshot().error).toBeUndefined()
  })
})

const replacement: ImportPreview = { ...preview, mode: 'replace', replacement: {
  accounts: [{ id: 'old', name: 'Old', currency: 'RUB', deleted_at: '2026-01-01' }],
  counts: { accounts: 1, deleted_accounts: 1, transactions: 2, transfers: 0, shares: 2, tag_links: 1, members: 1 }, blockers: {},
} }
function setupReplacement() {
  const s = setup()
  s.api.availability.mockResolvedValue({ available: false, reasons: ['owned_accounts'] })
  s.api.preview.mockResolvedValue(structuredClone(replacement))
  s.api.configure.mockResolvedValue({ ...replacement, preview_id: 'replacement-2' })
  s.model.setMode('replace')
  return s
}
describe('Monefy replacement workflow', () => {
  it('previews a nonempty account and requires separate deletion consent', async () => {
    const { model, api } = setupReplacement()
    await model.upload(file)
    expect(api.preview).toHaveBeenCalledExactlyOnceWith(file, 'replace')
    model.accept(true)
    await model.confirm()
    expect(api.confirm).not.toHaveBeenCalled()
    model.acceptDeletion(true)
    await Promise.all([model.confirm(), model.confirm()])
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith('preview-1', true, true)
  })
  it('deletion consent does not bypass exclusions or blocking shared relations', async () => {
    const { model, api } = setupReplacement()
    await model.upload(file); model.acceptDeletion(true); await model.confirm()
    expect(api.confirm).not.toHaveBeenCalled()
    api.preview.mockResolvedValue({ ...replacement, replacement: { ...replacement.replacement!, blockers: { shared_accounts: 1 } } })
    await model.upload(file); model.accept(true); model.acceptDeletion(true); await model.confirm()
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('clears deletion consent when options, file or mode change and supports cancellation', async () => {
    const { model, api } = setupReplacement()
    await model.upload(file); model.accept(true); model.acceptDeletion(true)
    await model.configure('a', 'deposit')
    expect(model.getSnapshot().deletionAccepted).toBe(false)
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
    model.acceptDeletion(true); await model.upload(file)
    expect(model.getSnapshot().deletionAccepted).toBe(false)
    model.acceptDeletion(true); model.setMode('empty')
    expect(model.getSnapshot().preview).toBeUndefined()
    expect(model.getSnapshot().deletionAccepted).toBe(false)
    model.setMode('replace'); await model.upload(file); model.accept(true); model.acceptDeletion(true); model.cancel()
    await model.confirm(); expect(api.confirm).not.toHaveBeenCalled()
  })
  it('rejects a response for the wrong mode and failed source validation', async () => {
    const { model, api } = setupReplacement()
    api.preview.mockResolvedValue(preview)
    await model.upload(file); model.accept(true); model.acceptDeletion(true)
    expect(canConfirmImport(model.getSnapshot())).toBe(false)
    api.preview.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { error: 'source_format' } } })
    await model.upload(file); await model.confirm()
    expect(model.getSnapshot().preview).toBeUndefined()
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('recovers the same deletion consent after network loss and reload', async () => {
    const { model, api, storage } = setupReplacement()
    await model.upload(file); model.accept(true); model.acceptDeletion(true)
    api.confirm.mockRejectedValueOnce(new Error('offline'))
    await model.confirm()
    model.setMode('empty'); model.cancel(); await model.upload(file)
    expect(api.preview).toHaveBeenCalledOnce()
    const restored = new MonefyImport('u', api, storage)
    await restored.recover()
    expect(api.confirm.mock.calls).toEqual([['preview-1', true, true], ['preview-1', true, true]])
    expect(restored.getSnapshot().phase).toBe('done')
  })
  it('requires a fresh preview and fresh consent after a concurrent edit', async () => {
    const { model, api } = setupReplacement()
    await model.upload(file); model.accept(true); model.acceptDeletion(true)
    api.confirm.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { error: 'replacement_changed' } } })
    await model.confirm()
    expect(model.getSnapshot().preview).toBeUndefined()
    expect(model.getSnapshot().deletionAccepted).toBe(false)
    expect(model.getSnapshot().error).toContain('Состав старых данных изменился')
  })
})
