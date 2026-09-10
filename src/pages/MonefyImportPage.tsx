import { ImportAccountAccess } from '@/components/ImportAccountAccess'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IonButton, IonCheckbox, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonItem, IonInput, IonPage, IonSelect, IonSelectOption, IonSpinner, IonText, useIonViewWillEnter } from '@ionic/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'
import { canConfirmImport, importReasons, MonefyImport, type ImportState } from '@/lib/monefyImport'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'
import type { ImportMode } from '@/api/monefy'
import type { AccountKind } from '@/api/accounts'
import { AccountIconSettings } from '@/components/AccountIconSettings'
import { CategoryIconSettings } from '@/components/CategoryIconSettings'
import { CategoryIcon } from '@/components/CategoryIcon'
import { MonefyImportDiagnostics, importAccountAnchor, scrollToImportAccount } from '@/components/MonefyImportDiagnostics'
import './MonefyImportPage.css'

const countNames: Record<string, string> = { accounts: 'Счета', categories: 'Категории', transactions: 'Операции', transfers: 'Переводы', deleted_accounts: 'Из них ранее удалённые счета', members: 'Участие в счетах', shares: 'Доли операций', tag_links: 'Связи операций с тегами' }
const date = (value: string | null) => value ? value.slice(0, 10) : 'нет данных'

export function ImportPreviewDetails({ state, controller }: { state: ImportState; controller: MonefyImport }) {
  const p = state.preview
  if (!p) return null
  const locked = state.phase !== 'idle'
  return <>
    <IonCard>
      <IonCardHeader><IonCardTitle>Предпросмотр</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p>{state.fileName}</p>
        <dl className="import-summary">{Object.entries(p.counts).map(([key, value]) => <div key={key}><dt>{countNames[key] || key}</dt><dd>{value}</dd></div>)}</dl>
        <p>Период: {date(p.period_from)} — {date(p.period_to)}</p>
        <p>Валюты: {p.currencies.join(', ') || 'нет'}</p>
        <p>Предпросмотр действует до {new Date(p.expires_at).toLocaleString('ru-RU')}.</p>
      </IonCardContent>
    </IonCard>
    {p.accounts.some(a => !a.kind) && <IonCard>
      <IonCardHeader><IonCardTitle>Выберите тип каждого счёта</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p>Текущие средства — повседневные деньги; вклад — средства на банковском вкладе; инвестиции — инвестиционные активы. Это настройка импорта, а не ошибка файла.</p>
        <p>Осталось заполнить: {p.accounts.filter(a => !a.kind).length}.</p>
        {p.accounts.filter(a => !a.kind).map(a => <IonButton key={a.source_id} size="small" fill="outline" onClick={() => scrollToImportAccount(a.source_id)}>{a.name}</IonButton>)}
      </IonCardContent>
    </IonCard>}
    {p.mode === 'replace' && p.replacement && <IonCard>
      <IonCardHeader><IonCardTitle>Полная замена: старые данные</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p>Состав проверяемой истории (при наличии блокировок удаление запрещено):</p>
        <dl className="import-summary">{Object.entries(p.replacement.counts).map(([key, value]) => <div key={key}><dt>{countNames[key] || key}</dt><dd>{value}</dd></div>)}</dl>
        <ul>{p.replacement.accounts.map(a => <li key={a.id}>{a.name} · {a.currency}{a.deleted_at ? ' · ранее удалён' : ''}</li>)}</ul>
        <p>Старые личные счета, операции, переводы, доли и связи с тегами будут удалены физически. Общий справочник категорий и тегов, профиль, вход и настройки сохраняются.</p>
        <p>Общие счета и внешние связи блокируют замену.</p>
      </IonCardContent>
    </IonCard>}
    {!!p.currency_rates?.length && <IonCard>
      <IonCardHeader><IonCardTitle>Операции без исторического курса</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p>Для этих операций используется текущий курс, зафиксированный при подготовке. Можно указать свой курс. Операции с историческим курсом сохраняют его.</p>
        {p.currency_rates.map(rate => <section key={rate.currency}>
          <p>{rate.currency} → {rate.base_currency}: операций {rate.transactions}. {rate.source === 'manual' ? 'Указанный вами курс' : rate.rate ? 'Текущий курс' : 'Курс не найден'}.</p>
          <IonInput label={`1 ${rate.currency} в ${rate.base_currency}`} labelPlacement="stacked" inputMode="decimal"
            value={state.rateDrafts?.[rate.currency] ?? rate.rate} disabled={locked}
            onIonInput={e => controller.editRate(rate.currency, e.detail.value || '')} />
        </section>)}
        <IonButton disabled={locked || !Object.keys(state.rateDrafts || {}).length} onClick={() => void controller.saveRates()}>Применить курсы</IonButton>
      </IonCardContent>
    </IonCard>}
    <h2>Счета и распределение</h2>
    <p>По умолчанию счета личные. Совместный доступ, участников и доли задайте до подтверждения: после импорта они неизменяемы. Название счёта не определяет совместный доступ. Флаг Monefy «Включать в общий баланс» не переносится и не определяет тип счёта. Отключённые счета также станут активными.</p>
    {p.accounts.map(a => <IonCard key={a.source_id} id={importAccountAnchor(a.source_id)}>
      <IonCardHeader><IonCardTitle>{a.name} · {a.currency}</IonCardTitle></IonCardHeader>
      <IonCardContent>
        {a.source_name && a.source_name !== a.name && <p>В файле: «{a.source_name}». Будет создан новый счёт «{a.name}», поскольку исходное название занято.</p>}
        <p>Начальный баланс: {a.initial_balance} {a.currency} на {date(a.initial_balance_date)}</p>
        <p>Итоговый баланс: {a.final_balance} {a.currency}</p>
        <ImportAccountAccess account={a} state={state} controller={controller} />
        <p>В общем балансе Monefy: {a.source_included_in_total ? 'да' : 'нет'}; {a.source_disabled_at ? `отключён с ${date(a.source_disabled_at)}` : 'активен'}.</p>
        {!a.kind && <p>Выберите тип этого счёта ниже.</p>}
        <IonItem lines="none"><IonSelect label={`Тип счёта «${a.name}»`} labelPlacement="stacked" interface="action-sheet" placeholder="Выберите тип" value={a.kind || undefined} disabled={locked} onIonChange={e => void controller.configure(a.source_id, e.detail.value as AccountKind)}>
          {ACCOUNT_KIND_OPTIONS.map(option => <IonSelectOption key={option.value} value={option.value}>{option.shortLabel}</IonSelectOption>)}
        </IonSelect></IonItem>
        <fieldset disabled={locked}><AccountIconSettings value={a.icon} allowCustom={false} sessionKey={a.source_id} onChange={icon => void controller.configureAccountIcon(a.source_id, icon)} /></fieldset>
      </IonCardContent>
    </IonCard>)}
    <IonCard><IonCardHeader><IonCardTitle>Общие категории</IonCardTitle></IonCardHeader><IonCardContent>
      <p>Совпадающие категории переиспользуются; остальные добавляются в общий справочник.</p>
      {p.categories.map(c => <section className="import-category" key={c.source_id}>
        <h3>{c.name} ({c.type === 'income' ? 'доход' : 'расход'}) — {c.existing_id ? 'переиспользуется' : 'новая'}</h3>
        {c.source_disabled_at && <p>Отключена в Monefy</p>}
        {c.existing_id ? <><CategoryIcon value={c.icon} type={c.type} /><p>Иконка общей категории сохраняется.</p></> :
          <fieldset disabled={locked}><CategoryIconSettings value={c.icon} type={c.type} sessionKey={c.source_id} onChange={icon => void controller.configureCategory(c.source_id, icon)} /></fieldset>}
      </section>)}
    </IonCardContent></IonCard>
    {state.preview && !state.preview.can_confirm && <IonButton disabled={locked} fill="outline" onClick={() => void controller.refreshOptions()}>Обновить предпросмотр</IonButton>}
    <MonefyImportDiagnostics state={state} controller={controller} />
    {p.mode === 'replace' ? <IonCard className="import-deletion-warning"><IonCardHeader><IonCardTitle>Безвозвратное удаление</IonCardTitle></IonCardHeader><IonCardContent>
      <p>Старые данные будут удалены безвозвратно. Резервная копия не создаётся. Отменить замену после завершения нельзя.</p>
      <IonCheckbox className="import-ack" disabled={locked} checked={state.deletionAccepted === true} onIonChange={e => controller.acceptDeletion(e.detail.checked)}>Подтверждаю безвозвратное удаление перечисленных старых данных без резервной копии</IonCheckbox>
    </IonCardContent></IonCard> : <p>После подтверждения будут созданы новые счета и добавлена история. Существующие счета и операции сохранятся. Совпадающие названия новых счетов получают суффикс (1), (2) и далее. Отменить применение на этом экране нельзя.</p>}
    <IonButton expand="block" disabled={!canConfirmImport(state)} onClick={() => void controller.confirm()} color={p.mode === 'replace' ? 'danger' : 'primary'}>{p.mode === 'replace' ? 'Удалить старые данные и импортировать' : 'Подтвердить импорт'}</IonButton>
  </>
}

export function MonefyImportPage() {
  const userID = useAuthStore(s => s.user?.id) || ''
  const username = useAuthStore(s => s.user?.username) || ''
  const qc = useQueryClient()
  const controller = useMemo(() => new MonefyImport(userID, undefined, localStorage, () => {
    for (const key of ['accounts', 'account', 'account-members', 'transfer-accounts', 'categories', 'tags', 'transactions', 'analytics']) void qc.invalidateQueries({ queryKey: [key] })
  }), [userID, qc])
  controller.setOwnerUsername(username)
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => { void controller.check() }, [controller])
  useIonViewWillEnter(() => { void controller.check() }, [controller])
  const busy = ['checking', 'previewing', 'configuring', 'confirming'].includes(state.phase)
  const applying = ['confirming', 'unknown', 'done'].includes(state.phase)
  return <IonPage><PageHeader title="Импорт Monefy" backHref="/dashboard" /><IonContent><main className="monefy-import ion-padding">
    <p id="import-file-format">Перенесите историю из одной резервной копии Monefy: файл базы SQLite с расширением .db (до 64 МБ). CSV, архивы и зашифрованные копии не подходят. Сначала файл проверяется без изменения ваших данных.</p>
    {busy && <div role="status"><IonSpinner /> {state.phase === 'confirming' ? 'Применяем импорт…' : 'Проверяем данные…'}</div>}
    {state.error && <IonText color="danger"><p role="alert">{state.error}</p></IonText>}
    {!applying && state.mode !== 'replace' && state.availability?.available === false && <IonCard><IonCardHeader><IonCardTitle>Импорт недоступен</IonCardTitle></IonCardHeader><IonCardContent><p>Сервер временно ограничил импорт.</p><ul>{state.availability.reasons.map(reason => <li key={reason}>{importReasons[reason] || `Ограничение сервера: ${reason}`}</li>)}</ul></IonCardContent></IonCard>}
    {!applying && <>
      <IonItem><IonSelect label="Режим импорта" labelPlacement="stacked" interface="alert" cancelText="Отмена" okText="Выбрать" value={state.mode || 'empty'} disabled={busy} onIonChange={e => controller.setMode(e.detail.value as ImportMode)}>
        <IonSelectOption value="empty">Добавить к моим данным</IonSelectOption>
        <IonSelectOption value="replace">Полная замена моих данных</IonSelectOption>
      </IonSelect></IonItem>
      {!busy && !state.availability && state.error && <IonButton fill="outline" onClick={() => void controller.check()}>Повторить проверку</IonButton>}
      <div className="import-file"><input aria-label="База Monefy (.db)" aria-describedby="import-file-format" type="file" accept=".db" disabled={!state.availability || (state.mode !== 'replace' && !state.availability.available)} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void controller.upload(file) }} /></div>
      <ImportPreviewDetails state={state} controller={controller} />
      {(state.preview || state.fileName) && <IonButton expand="block" fill="clear" onClick={() => controller.cancel()}>Отменить подготовку</IonButton>}
    </>}
    {state.phase === 'unknown' && <IonCard><IonCardHeader><IonCardTitle>Результат пока неизвестен</IonCardTitle></IonCardHeader><IonCardContent><p>Сервер мог завершить импорт. Не загружайте базу заново. Проверка использует прежнее подтверждение и не создаёт дубликаты. Если запрос ещё не применён, сервер завершит его.</p><IonButton expand="block" onClick={() => void controller.recover()}>Проверить результат импорта</IonButton></IonCardContent></IonCard>}
    {state.result && <IonCard><IonCardHeader><IonCardTitle>Импорт завершён</IonCardTitle></IonCardHeader><IonCardContent><p>Счета: {state.result.accounts}. Новые категории: {state.result.categories}, переиспользованы: {state.result.reused_categories}. Операции: {state.result.transactions}, переводы: {state.result.transfers}.</p><IonButton routerLink="/accounts">Открыть счета</IonButton><IonButton fill="outline" routerLink="/transactions">История операций</IonButton></IonCardContent></IonCard>}
  </main></IonContent></IonPage>
}
