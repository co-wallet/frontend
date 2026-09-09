import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MonefyImportDiagnostics } from './MonefyImportDiagnostics'
import type { ImportState, MonefyImport } from '@/lib/monefyImport'
import type { ImportPreview } from '@/api/monefy'

const account = { icon: 'preset:wallet|blue|blue', source_id: 'account-uuid', name: 'Кошелёк в поездках', currency: 'TRY', kind: '' as const, initial_balance: '0', initial_balance_date: '2020-01-01', final_balance: '100', source_included_in_total: true, source_disabled_at: null }
const preview: ImportPreview = {
  preview_id: 'p', expires_at: '2099-01-01', can_confirm: false, requires_exclusion_confirmation: true,
  counts: {}, currencies: ['TRY'], period_from: null, period_to: null, accounts: [account], categories: [], deleted: {},
  diagnostics: [
    { code: 'target_account_kind', severity: 'blocking', entity: 'Account', source_id: account.source_id, message: 'Выберите spending, deposit или investment' },
    { code: 'unknown_currency', severity: 'blocking', entity: 'Account', source_id: account.source_id, message: 'Валюта отсутствует или не поддерживается' },
    { code: 'disabled_account', severity: 'warning', entity: 'Account', source_id: account.source_id, message: 'Счёт отключён' },
    { code: 'deleted_reference', severity: 'confirmation', entity: 'Transaction', source_id: 'transaction-uuid', message: 'Живая запись ссылается на удалённый счёт' },
  ],
  exclusions: [{ entity: 'Transaction', source_id: 'transaction-uuid', reason: 'Живая запись ссылается на удалённый счёт' }],
}
const render = (p = preview) => renderToStaticMarkup(<MonefyImportDiagnostics state={{ preview: p, phase: 'idle', accepted: false } as ImportState} controller={{} as MonefyImport} />)
const visible = (html: string) => html.split('<details')[0]
describe('Monefy import diagnostic guidance', () => {
  it('names the account and currency and gives an administrator a concrete action', () => {
    const html = visible(render())
    expect(html).toContain('Кошелёк в поездках')
    expect(html).toContain('валюта TRY не поддерживается')
    expect(html).toContain('добавить или включить TRY')
    expect(html).toContain('Перейти к счёту')
    expect(html).not.toContain('account-uuid')
  })
  it('distinguishes a missing source currency from a server currency setting', () => {
    const html = visible(render({ ...preview, accounts: [{ ...account, currency: '' }] }))
    expect(html).toContain('не указана валюта')
    expect(html).toContain('Проверьте валюту этого счёта в Monefy')
    expect(html).not.toContain('добавить или включить')
  })
  it('treats kind selection as remaining form work and immediately updates after a local choice', () => {
    expect(visible(render())).toContain('Осталось выбрать тип счетов: 1')
    expect(visible(render({ ...preview, accounts: [{ ...account, kind: 'spending' }] }))).not.toContain('Осталось выбрать тип')
    expect(visible(render())).not.toContain('spending')
    expect(visible(render())).not.toContain('Выберите spending')
  })
  it('explains exclusions once, separately from blockers, and keeps technical IDs collapsed', () => {
    const html = render()
    const main = visible(html)
    expect(main).toContain('Что мешает импорту (1)')
    expect(main).toContain('Что изменится при переносе (1)')
    expect(main).toContain('Будут пропущены записи: 1')
    expect(main).toContain('могут повлиять на итоговые балансы')
    expect(main).toContain('Ничего исправлять не нужно')
    expect(main).not.toContain('Живая запись')
    expect(main).not.toContain('transaction-uuid')
    expect(html).toContain('<summary>Технические сведения для диагностики</summary>')
    expect(html).toContain('transaction-uuid')
    expect(html).not.toContain('<details open')
  })
  it('keeps unknown blocking errors visible with a safe next step', () => {
    const html = visible(render({ ...preview, diagnostics: [{ code: 'future_error', severity: 'blocking', entity: '', source_id: '', message: 'Новый формат данных' }] }))
    expect(html).toContain('Новый формат данных')
    expect(html).toContain('не редактируйте базу наугад')
  })
})
