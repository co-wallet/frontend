import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCheckbox, IonContent, IonItem, IonPage, IonSelect, IonSelectOption, IonSpinner, IonText, useIonViewWillEnter } from '@ionic/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'
import { canConfirmImport, importReasons, MonefyImport, type ImportState } from '@/lib/monefyImport'
import type { AccountKind } from '@/api/accounts'
import './MonefyImportPage.css'

const countNames: Record<string, string> = { accounts: 'Счета', categories: 'Категории', transactions: 'Операции', transfers: 'Переводы' }
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
    <h2>Личные счета</h2>
    <p>Все счета будут личными и активными. Название счёта не определяет совместный доступ. Флаг Monefy «Включать в общий баланс» не переносится и не определяет тип счёта. Отключённые счета также станут активными.</p>
    {p.accounts.map(a => <IonCard key={a.source_id}>
      <IonCardHeader><IonCardTitle>{a.name} · {a.currency}</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p>Начальный баланс: {a.initial_balance} {a.currency} на {date(a.initial_balance_date)}</p>
        <p>Итоговый баланс: {a.final_balance} {a.currency}</p>
        <p>В общем балансе Monefy: {a.source_included_in_total ? 'да' : 'нет'}; {a.source_disabled_at ? `отключён с ${date(a.source_disabled_at)}` : 'активен'}.</p>
        <IonItem lines="none"><IonSelect label={`Тип счёта «${a.name}»`} labelPlacement="stacked" interface="action-sheet" placeholder="Выберите тип" value={a.kind || undefined} disabled={locked} onIonChange={e => void controller.configure(a.source_id, e.detail.value as AccountKind)}>
          <IonSelectOption value="spending">Текущий</IonSelectOption><IonSelectOption value="deposit">Накопительный</IonSelectOption><IonSelectOption value="investment">Инвестиционный</IonSelectOption>
        </IonSelect></IonItem>
      </IonCardContent>
    </IonCard>)}
    <IonCard><IonCardHeader><IonCardTitle>Общие категории</IonCardTitle></IonCardHeader><IonCardContent>
      <p>Совпадающие категории переиспользуются; остальные добавляются в общий справочник.</p>
      <ul>{p.categories.map(c => <li key={c.source_id}>{c.name} ({c.type === 'income' ? 'доход' : 'расход'}) — {c.existing_id ? 'переиспользуется' : 'новая'}{c.source_disabled_at ? '; отключена в Monefy' : ''}</li>)}</ul>
    </IonCardContent></IonCard>
    <IonCard><IonCardHeader><IonCardTitle>Предупреждения и исключения</IonCardTitle></IonCardHeader><IonCardContent>
      {!p.diagnostics.length && !p.exclusions.length && <p>Предупреждений и исключений нет.</p>}
      <ul>{p.diagnostics.map((d, i) => <li key={i}><IonText color={d.severity === 'blocking' ? 'danger' : undefined}>{d.severity === 'blocking' ? 'Ошибка: ' : ''}{d.message} {d.entity} {d.source_id}</IonText></li>)}</ul>
      <ul>{p.exclusions.map((e, i) => <li key={i}>Не переносится: {e.entity} {e.source_id} — {e.reason}</li>)}</ul>
      {Object.entries(p.deleted || {}).map(([key, value]) => <p key={key}>Удалённые записи {key}: {value} — не переносятся.</p>)}
      {(p.requires_exclusion_confirmation || p.diagnostics.some(d => d.severity === 'confirmation')) && <IonCheckbox className="import-ack" checked={state.accepted} disabled={locked} onIonChange={e => controller.accept(e.detail.checked)}>Принимаю все перечисленные исключения</IonCheckbox>}
      {p.accounts.some(a => !a.kind) && <p>Выберите тип каждого счёта. После этого предпросмотр обновится.</p>}
      {!p.can_confirm && p.diagnostics.some(d => d.severity === 'blocking' && d.code !== 'target_account_kind') && <IonText color="danger"><p>Ошибки блокируют импорт. Исправьте исходный файл и загрузите его заново.</p></IonText>}
    </IonCardContent></IonCard>
    <p>После подтверждения счета и история будут добавлены в co-wallet. Отменить применение на этом экране нельзя.</p>
    <IonButton expand="block" disabled={!canConfirmImport(state)} onClick={() => void controller.confirm()}>Подтвердить импорт</IonButton>
  </>
}

export function MonefyImportPage() {
  const userID = useAuthStore(s => s.user?.id) || ''
  const qc = useQueryClient()
  const controller = useMemo(() => new MonefyImport(userID, undefined, localStorage, () => {
    for (const key of ['accounts', 'transfer-accounts', 'categories', 'transactions', 'analytics']) void qc.invalidateQueries({ queryKey: [key] })
  }), [userID, qc])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => { void controller.check() }, [controller])
  useIonViewWillEnter(() => { void controller.check() }, [controller])
  const busy = ['checking', 'previewing', 'configuring', 'confirming'].includes(state.phase)
  const applying = ['confirming', 'unknown', 'done'].includes(state.phase)
  return <IonPage><PageHeader title="Импорт Monefy" backHref="/dashboard" /><IonContent><main className="monefy-import ion-padding">
    <p>Перенесите историю из одной резервной копии Monefy: файл базы SQLite с расширением .db (до 64 МБ). CSV, архивы и зашифрованные копии не подходят. Сначала файл проверяется без изменения ваших данных.</p>
    {busy && <div role="status"><IonSpinner /> {state.phase === 'confirming' ? 'Применяем импорт…' : 'Проверяем данные…'}</div>}
    {state.error && <IonText color="danger"><p role="alert">{state.error}</p></IonText>}
    {!applying && state.availability?.available === false && <IonCard><IonCardHeader><IonCardTitle>Импорт недоступен</IonCardTitle></IonCardHeader><IonCardContent><p>Нужна пустая учётная запись.</p><ul>{state.availability.reasons.map(reason => <li key={reason}>{importReasons[reason] || `Ограничение сервера: ${reason}`}</li>)}</ul></IonCardContent></IonCard>}
    {!applying && <>
      <IonButton fill="outline" disabled={busy} onClick={() => void controller.check()}>Проверить доступность</IonButton>
      <label className="import-file">База Monefy (.db)<input type="file" accept=".db" disabled={!state.availability?.available} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void controller.upload(file) }} /></label>
      <ImportPreviewDetails state={state} controller={controller} />
      {(state.preview || state.fileName) && <IonButton expand="block" fill="clear" onClick={() => controller.cancel()}>Отменить подготовку</IonButton>}
    </>}
    {state.phase === 'unknown' && <IonCard><IonCardHeader><IonCardTitle>Результат пока неизвестен</IonCardTitle></IonCardHeader><IonCardContent><p>Сервер мог завершить импорт. Не загружайте базу заново. Проверка использует прежнее подтверждение и не создаёт дубликаты. Если запрос ещё не применён, сервер завершит его.</p><IonButton expand="block" onClick={() => void controller.recover()}>Проверить результат импорта</IonButton></IonCardContent></IonCard>}
    {state.result && <IonCard><IonCardHeader><IonCardTitle>Импорт завершён</IonCardTitle></IonCardHeader><IonCardContent><p>Счета: {state.result.accounts}. Новые категории: {state.result.categories}, переиспользованы: {state.result.reused_categories}. Операции: {state.result.transactions}, переводы: {state.result.transfers}.</p><IonButton routerLink="/accounts">Открыть счета</IonButton><IonButton fill="outline" routerLink="/transactions">История операций</IonButton></IonCardContent></IonCard>}
  </main></IonContent></IonPage>
}
