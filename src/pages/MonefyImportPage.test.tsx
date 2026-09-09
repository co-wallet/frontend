import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ImportPreviewDetails } from './MonefyImportPage'
import type { MonefyImport, ImportState } from '@/lib/monefyImport'

vi.mock('@/api/monefy', () => ({ monefyApi: {} }))
const state: ImportState = { phase: 'idle', accepted: false, availability: { available: true, reasons: [] }, preview: {
  preview_id: 'p', expires_at: '2099-01-01', can_confirm: true, requires_exclusion_confirmation: true,
  counts: { accounts: 1, categories: 1, transactions: 2, transfers: 1 }, period_from: '2020-01-01', period_to: '2025-01-01', currencies: ['RUB'],
  accounts: [{ source_id: 'a', name: 'Семья', currency: 'RUB', kind: 'investment', initial_balance: '100.0001', initial_balance_date: '2020-01-01', final_balance: '50.0001', source_included_in_total: false, source_disabled_at: '2025-01-01' }],
  categories: [{ source_id: 'c', name: 'Еда', type: 'expense', existing_id: 'x', source_disabled_at: null }],
  diagnostics: [{ severity: 'warning', code: 'flags', message: 'Флаги не переносятся', source_id: '', entity: '' }], exclusions: [{ entity: 'Transaction', source_id: 't', reason: 'Удалённый счёт' }], deleted: { Account: 1 },
} }
const render = (s = state) => renderToStaticMarkup(<ImportPreviewDetails state={s} controller={{} as MonefyImport} />)
describe('Monefy preview UI', () => {
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
  it('shows a blocking error and disables confirmation', () => {
    const html = render({ ...state, accepted: true, preview: { ...state.preview!, can_confirm: false, diagnostics: [{ severity: 'blocking', code: 'invalid_currency', message: 'Неизвестная валюта', entity: '', source_id: '' }] } })
    expect(html).toContain('Ошибки блокируют импорт')
    expect(html).toMatch(/ion-button[^>]*disabled="true"/)
  })
})
