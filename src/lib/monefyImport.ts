import axios from 'axios'
import { monefyApi, type ImportMode, type ImportAvailability, type ImportPreview, type ImportResult } from '@/api/monefy'
import type { AccountKind } from '@/api/accounts'

export const importReasons: Record<string, string> = {
  owned_accounts: 'У вас уже есть собственные счета (включая удалённые).',
  created_categories: 'Вы уже создавали категории.',
  account_membership: 'Вы участвуете в существующих счетах.',
  transactions: 'У вас уже есть операции или доли в операциях.',
}
const errors: Record<string, string> = {
  deletion_not_confirmed: 'Отдельно подтвердите безвозвратное удаление старых данных.',
  replacement_changed: 'Состав старых данных изменился. Создайте новый предпросмотр и подтвердите удаление заново.',
  replacement_blocked: 'Общие счета или внешние связи блокируют замену. Создайте новый предпросмотр.',
  invalid_import_mode: 'Выберите режим импорта заново.',
  account_not_empty: 'Учётная запись больше не пуста. Импорт недоступен.',
  invalid_account_icons: 'Не удалось сохранить оформление счёта. Выберите иконку и цвета из списка co-wallet.',
  invalid_category_icons: 'Не удалось сохранить иконки категорий. Выберите иконку из списка co-wallet.',
  preview_storage_full: 'На сервере не хватает места для предпросмотра. Повторите позже или обратитесь к администратору; файл не импортирован.',
  import_conflict: 'Сервер не смог подготовить импорт из-за конфликта состояния. Загрузите файл заново; если ошибка повторяется, передайте её администратору.',
  import_busy: 'Уже выполняется обработка файла. Дождитесь её завершения.',
  upload_too_large: 'Размер файла превышает 64 МБ.',
  preview_not_found: 'Предпросмотр истёк или был заменён более новым. Загрузите файл заново.',
  catalog_changed: 'Категории изменились. Создайте новый предпросмотр.',
  preview_stale: 'Параметры устарели. Создайте новый предпросмотр.',
  preview_blocked: 'Исправьте ошибки файла перед импортом.',
  exclusions_not_confirmed: 'Примите перечисленные исключения.',
}
function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error as string | undefined
    if (code && errors[code]) return errors[code]
    if (code?.startsWith('source_')) return `База Monefy не поддерживается или повреждена (${code}).`
    return code ? `Не удалось выполнить запрос (${code}).` : 'Нет ответа сервера. Проверьте соединение.'
  }
  return 'Не удалось выполнить запрос. Попробуйте позже.'
}
type Pending = { id: string; accepted: boolean; deletion?: boolean }
export interface ImportState {
  mode?: ImportMode
  deletionAccepted?: boolean
  phase: 'idle' | 'checking' | 'previewing' | 'configuring' | 'confirming' | 'unknown' | 'done'
  availability?: ImportAvailability
  preview?: ImportPreview
  result?: ImportResult
  accepted: boolean
  error?: string
  fileName?: string
}
export function canConfirmImport(s: ImportState) {
  const p = s.preview
  return s.phase === 'idle' && !!s.availability && (s.mode === 'replace' || s.availability.available === true) && !!p?.can_confirm &&
    (p.mode || 'empty') === (s.mode || 'empty') &&
    (p.mode !== 'replace' || (!!p.replacement && s.deletionAccepted === true && !Object.values(p.replacement.blockers).some(n => n > 0))) &&
    Date.parse(p.expires_at) > Date.now() && !p.diagnostics.some(d => d.severity === 'blocking') &&
    (!(p.requires_exclusion_confirmation || p.diagnostics.some(d => d.severity === 'confirmation')) || s.accepted)
}

// Only a receipt identifier is persisted; the uploaded financial data stays in memory.
export class MonefyImport {
  private state: ImportState
  private listeners = new Set<() => void>()
  private generation = 0
  private pending?: Pending
  private key: string
  constructor(userID: string, private api = monefyApi, private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage, private onSuccess: () => void = () => {}) {
    this.key = `monefy-pending:${userID}`
    try {
      const saved = JSON.parse(storage.getItem(this.key) || 'null')
      if (typeof saved?.id === 'string' && typeof saved?.accepted === 'boolean') this.pending = saved
    } catch { /* Storage may be unavailable; confirmation checks it before sending. */ }
    this.state = { phase: this.pending ? 'unknown' : 'idle', accepted: false, mode: 'empty', deletionAccepted: false }
  }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<ImportState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) }
  async check() {
    if (this.pending || this.state.phase !== 'idle') return
    const version = ++this.generation
    this.update({ phase: 'checking', error: undefined })
    try {
      const availability = await this.api.availability()
      if (version === this.generation) this.update({ availability, phase: 'idle' })
    } catch (e) { if (version === this.generation) this.update({ availability: undefined, phase: 'idle', error: errorText(e) }) }
  }
  cancel() {
    if (this.pending || this.state.phase === 'done') return
    ++this.generation
    this.update({ phase: 'idle', preview: undefined, accepted: false, deletionAccepted: false, error: undefined, fileName: undefined })
  }
  setMode(mode: ImportMode) {
    if (this.pending || this.state.phase === 'done' || !['empty', 'replace'].includes(mode)) return
    this.cancel()
    this.update({ mode })
  }
  acceptDeletion(value: boolean) { this.update({ deletionAccepted: value }) }
  accept(value: boolean) { this.update({ accepted: value }) }
  async upload(file?: File) {
    if (this.pending || this.state.phase === 'done') return
    this.cancel()
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.db') || !file.size || file.size > 64 * 1024 * 1024) {
      this.update({ error: 'Выберите один непустой файл .db размером до 64 МБ.' }); return
    }
    const version = ++this.generation
    this.update({ phase: 'previewing', fileName: file.name })
    try {
      const availability = await this.api.availability()
      if (version !== this.generation) return
      this.update({ availability })
      if (this.state.mode !== 'replace' && !availability.available) { this.update({ phase: 'idle' }); return }
      const preview = await this.api.preview(file, this.state.mode || 'empty')
      if (version === this.generation) this.update({ phase: 'idle', preview })
    } catch (e) { if (version === this.generation) this.update({ phase: 'idle', error: errorText(e) }) }
  }
  async configure(sourceID: string, kind: AccountKind) {
    const p = this.state.preview
    if (!p || this.state.phase !== 'idle' || this.pending) return
    if (!['spending', 'deposit', 'investment'].includes(kind)) return
    const accounts = p.accounts.map(a => a.source_id === sourceID ? { ...a, kind } : a)
    await this.saveOptions({ ...p, accounts, can_confirm: false })
  }
  async configureAccountIcon(sourceID: string, icon: string) {
    const p = this.state.preview
    if (!p || this.state.phase !== 'idle' || this.pending) return
    if (!p.accounts.some(a => a.source_id === sourceID)) return
    const accounts = p.accounts.map(a => a.source_id === sourceID ? { ...a, icon } : a)
    await this.saveOptions({ ...p, accounts, can_confirm: false })
  }
  async configureCategory(sourceID: string, icon: string) {
    const p = this.state.preview
    if (!p || this.state.phase !== 'idle' || this.pending) return
    if (!p.categories.some(c => c.source_id === sourceID && !c.existing_id)) return
    const categories = p.categories.map(c => c.source_id === sourceID ? { ...c, icon } : c)
    await this.saveOptions({ ...p, categories, can_confirm: false })
  }
  private async saveOptions(draft: ImportPreview) {
    this.update({ preview: draft, accepted: false, deletionAccepted: false, error: undefined })
    // Older previews may still contain untyped accounts; submit only complete options.
    if (draft.accounts.some(a => !a.kind)) return
    const kinds = Object.fromEntries(draft.accounts.map(a => [a.source_id, a.kind as AccountKind]))
    const categoryIcons = Object.fromEntries(draft.categories.filter(c => !c.existing_id).map(c => [c.source_id, c.icon]))
    const version = ++this.generation
    this.update({ phase: 'configuring' })
    try {
      const preview = await this.api.configure(draft.preview_id, kinds, categoryIcons, Object.fromEntries(draft.accounts.map(a => [a.source_id, a.icon])))
      if (version === this.generation) this.update({ preview, phase: 'idle' })
    } catch (e) { if (version === this.generation) this.update({ preview: undefined, phase: 'idle', error: errorText(e) }) }
  }
  async confirm() {
    if (!canConfirmImport(this.state) || this.pending) return
    const pending = { id: this.state.preview!.preview_id, accepted: this.state.accepted, deletion: this.state.preview!.mode === 'replace' && this.state.deletionAccepted === true }
    try { this.storage.setItem(this.key, JSON.stringify(pending)) }
    catch { this.update({ error: 'Разрешите локальное хранилище браузера: оно нужно для восстановления результата импорта.' }); return }
    this.pending = pending
    await this.apply()
  }
  async recover() { if (this.state.phase === 'unknown' && this.pending) await this.apply() }
  private async apply() {
    const pending = this.pending!
    this.update({ phase: 'confirming', error: undefined })
    let result: ImportResult
    try { result = await this.api.confirm(pending.id, pending.accepted, pending.deletion === true) }
    catch (e) {
      // A timeout or server/network failure can follow a committed transaction.
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      if (status && [400, 404, 409, 413, 415, 422].includes(status)) {
        try { this.storage.removeItem(this.key) } catch { /* Retaining the same receipt cannot duplicate an import. */ }
        this.pending = undefined
        this.update({ phase: 'idle', preview: undefined, accepted: false, deletionAccepted: false, error: errorText(e) })
        await this.checkAfterFailure()
      } else this.update({ phase: 'unknown', error: errorText(e) })
      return
    }
    try { this.storage.removeItem(this.key) } catch { /* A retained receipt is safe to recover. */ }
    this.pending = undefined
    this.update({ phase: 'done', result, preview: undefined })
    this.onSuccess()
  }
  private async checkAfterFailure() {
    try { this.update({ availability: await this.api.availability() }) }
    catch { this.update({ availability: undefined }) }
  }
}
