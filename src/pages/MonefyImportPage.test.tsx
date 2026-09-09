import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'
import { ImportPreviewDetails, MonefyImportPage } from './MonefyImportPage'
import type { MonefyImport, ImportState } from '@/lib/monefyImport'

vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof import('react')>(), useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot() }))
vi.mock('@/components/layout/PageHeader', () => ({ PageHeader: () => null }))
vi.mock('@/api/monefy', () => ({ monefyApi: {} }))
const state: ImportState = { phase: 'idle', accepted: false, availability: { available: true, reasons: [] }, preview: {
  preview_id: 'p', expires_at: '2099-01-01', can_confirm: true, requires_exclusion_confirmation: true,
  counts: { accounts: 1, categories: 1, transactions: 2, transfers: 1 }, period_from: '2020-01-01', period_to: '2025-01-01', currencies: ['RUB'],
  accounts: [{ source_id: 'a', name: 'Семья', currency: 'RUB', kind: 'investment', initial_balance: '100.0001', initial_balance_date: '2020-01-01', final_balance: '50.0001', source_included_in_total: false, source_disabled_at: '2025-01-01' }],
  categories: [{ source_id: 'c', name: 'Еда', type: 'expense', icon: 'preset:groceries', existing_id: 'x', source_disabled_at: null }],
  diagnostics: [{ severity: 'warning', code: 'flags', message: 'Флаги не переносятся', source_id: '', entity: '' }], exclusions: [{ entity: 'Transaction', source_id: 't', reason: 'Удалённый счёт' }], deleted: { Account: 1 },
} }
const render = (s = state) => renderToStaticMarkup(<ImportPreviewDetails state={s} controller={{} as MonefyImport} />)
describe('Monefy preview UI', () => {
  it('provides an accessible file name and format description without a visible label', () => {
    const html = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><MonefyImportPage /></QueryClientProvider>)
    expect(html).toMatch(/input[^>]*aria-label="База Monefy \(.db\)"[^>]*aria-describedby="import-file-format"[^>]*type="file"[^>]*accept=".db"/)
    expect(html).toContain('id="import-file-format"')
    expect(html).toContain('SQLite с расширением .db (до 64 МБ)')
    expect(html.replace(/<[^>]*>/g, '')).not.toContain('База Monefy (.db)')
  })
  it('shows current funds by default with shared type names and permits confirmation', () => {
    const html = render({ ...state, preview: { ...state.preview!, requires_exclusion_confirmation: false, exclusions: [], accounts: [{ ...state.preview!.accounts[0], kind: 'spending' }] } })
    expect(html).toMatch(/ion-select[^>]*value="spending"/)
    for (const option of ACCOUNT_KIND_OPTIONS) expect(html).toContain(`value="${option.value}">${option.shortLabel}`)
    expect(html).not.toContain('Накопительный')
    expect(html).not.toContain('Выберите тип каждого счёта')
    expect(html).not.toMatch(/ion-button[^>]*disabled="true"/)
  })
  it('shows exact balances, period, reused categories, flags, diagnostics and exclusions', () => {
    const html = render()
    for (const text of ['100.0001', '50.0001', '2020-01-01', '2025-01-01', 'переиспользуется', 'личными и активными', 'Флаги не переносятся', 'Удалённый счёт', 'отключён с', 'Переводы']) expect(html).toContain(text)
    expect(html).toMatch(/ion-select[^>]*value="investment"/)
    expect(html).toContain('value="spending"')
    expect(html).toContain('value="deposit"')
  })
  it('disables confirmation before acceptance and enables it afterwards', () => {
    expect(render()).toMatch(/ion-button[^>]*disabled="true"/)
    expect(render({ ...state, accepted: true })).not.toMatch(/ion-button[^>]*disabled="true"/)
  })
  it('asks for account types without incorrectly calling the source file broken', () => {
    const html = render({ ...state, preview: { ...state.preview!, can_confirm: false,
      accounts: [{ ...state.preview!.accounts[0], kind: '' }],
      diagnostics: [{ severity: 'blocking', code: 'target_account_kind', message: 'Выберите тип', source_id: 'a', entity: 'Account' }],
    } })
    expect(html).toContain('Выберите тип каждого счёта')
    expect(html).not.toContain('Исправьте исходный файл')
  })
  it('uses the shared icon picker for new categories and keeps existing icons read-only', () => {
    const existing = render()
    expect(existing).toContain('Иконка общей категории сохраняется')
    expect(existing).not.toContain('Иконка категории')
    const fresh = render({ ...state, preview: { ...state.preview!, categories: [{ ...state.preview!.categories[0], existing_id: undefined }] } })
    expect(fresh).toContain('Иконка категории')
    expect(fresh).toContain('Иконка «Продукты»')
    expect(fresh).not.toContain('📁')
    expect(fresh).not.toContain('💰')
  })
  it('shows a blocking error and disables confirmation', () => {
    const html = render({ ...state, accepted: true, preview: { ...state.preview!, can_confirm: false, diagnostics: [{ severity: 'blocking', code: 'invalid_currency', message: 'Неизвестная валюта', entity: '', source_id: '' }] } })
    expect(html).toContain('Что мешает импорту')
    expect(html).toMatch(/ion-button[^>]*disabled="true"/)
  })
})
