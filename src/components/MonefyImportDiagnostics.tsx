import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCheckbox, IonText } from '@ionic/react'
import type { ImportPreview } from '@/api/monefy'
import type { ImportState, MonefyImport } from '@/lib/monefyImport'

type Diagnostic = ImportPreview['diagnostics'][number]
const entityNames: Record<string, string> = {
  Account: 'Счёт', Category: 'Категория', Transaction: 'Операция', Transfer: 'Перевод',
  CurrencyRate: 'Курс валют', Currency: 'Валюта', Schedule: 'Расписание', Setting: 'Настройка',
}
export const importAccountAnchor = (id: string) => `import-account-${id}`
export function scrollToImportAccount(id: string) {
  document.getElementById(importAccountAnchor(id))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function explain(p: ImportPreview, d: Diagnostic) {
  const account = d.entity === 'Account' ? p.accounts.find(a => a.source_id === d.source_id) : undefined
  const category = d.entity === 'Category' ? p.categories.find(c => c.source_id === d.source_id) : undefined
  const name = account ? `Счёт «${account.name}»` : category ? `Категория «${category.name}»` : entityNames[d.entity] || 'Данные файла'
  if (d.code.startsWith('target_replace_')) return {
    title: d.message,
    action: 'Замена остановлена из-за связей в текущей учётной записи co-wallet. Загрузка другого файла Monefy не устранит эти связи. Общая история и данные других пользователей сохраняются.',
  }
  switch (d.code) {
    case 'unknown_currency': return {
      title: `${name}: ${account?.currency ? `валюта ${account.currency} не поддерживается` : 'не указана валюта'}`,
      action: account?.currency
        ? `Администратору нужно добавить или включить ${account.currency} в разделе «Валюты». Затем загрузите этот файл заново. Менять суммы или валюту счёта для обхода ошибки не нужно.`
        : 'Проверьте валюту этого счёта в Monefy и создайте новую резервную копию. В текущем файле не найдена валюта, на которую ссылается счёт.',
    }
    case 'disabled_account': return {
      title: `${name} отключён в Monefy`,
      action: 'Его история будет перенесена, а сам счёт станет активным в co-wallet. Ничего исправлять не нужно.',
    }
    case 'target_icons': return { title: 'Оформление подобрано автоматически', action: 'Иконки подобраны по названиям, цвета выбраны из палитры co-wallet. В разделах счетов и новых категорий выше можно изменить оформление. Иконки общих категорий сохраняются.' }
    case 'target_flags': return { title: 'Счета будут личными и активными', action: 'Флаг включения в общий баланс Monefy не переносится. Выберите тип каждого счёта выше: он определяет, в какой группе средств счёт отображается.' }
    case 'deleted_reference': return { title: `${name} связана с удалёнными данными`, action: 'Эта запись не будет перенесена. Если согласны пропустить её, примите исключения ниже. Если она нужна, исправьте связи со счётом или категорией в исходных данных и подготовьте новую копию.' }
    case 'target_before_initial_balance': return { title: `${name}: дата раньше начального остатка`, action: 'Проверьте дату операции и дату начального остатка в исходных данных. Исправьте расхождение и создайте новую копию.' }
    case 'target_ambiguous_category': return { title: `${name}: несколько совпадающих категорий`, action: 'Устраните категории с одинаковым названием и типом в Monefy или общем справочнике co-wallet. Затем загрузите файл заново.' }
    case 'target_name_length': return { title: `${name}: слишком длинное название`, action: 'Сократите название до 100 символов в Monefy и создайте новую копию.' }
    case 'target_amount_range': case 'amount_range': return { title: `${name}: сумма не может быть перенесена`, action: 'Проверьте сумму в исходных данных: нулевая сумма операции или сумма за пределами поддерживаемого диапазона блокирует импорт. Не меняйте сумму произвольно; технические сведения приведены ниже.' }
    case 'ambiguous_rate': return { title: 'Для перевода не найден однозначный исторический курс', action: 'Проверьте курс на дату перевода в исходных данных. Текущий курс не заменяет исторический. Подготовьте исправленную резервную копию.' }
    case 'invalid_reference': return { title: `${name}: не найдены связанные данные`, action: 'В файле отсутствует связанный счёт, категория или валюта. Подготовьте целую резервную копию Monefy; частичный файл импортировать нельзя.' }
    case 'unsupported_schedule': return { title: 'Перенос расписаний пока не поддерживается', action: 'Этот файл содержит расписание или связанную с ним операцию. Импорт заблокирован: потребуется поддержка такого формата либо копия без расписаний. Сохраните исходную резервную копию.' }
    default: return { title: d.message, action: d.severity === 'blocking' ? 'Импорт остановлен. Передайте технические сведения ниже для проверки совместимости файла; не редактируйте базу наугад.' : '' }
  }
}

export function MonefyImportDiagnostics({ state, controller }: { state: ImportState; controller: MonefyImport }) {
  const p = state.preview
  if (!p) return null
  // Kind validation is presented next to the actual fields, not as a file error.
  const diagnostics = p.diagnostics.filter(d => d.code !== 'target_account_kind' &&
    !(d.severity === 'confirmation' && p.exclusions.some(e => e.entity === d.entity && e.source_id === d.source_id)))
  const blockers = diagnostics.filter(d => d.severity === 'blocking')
  const warnings = diagnostics.filter(d => d.severity !== 'blocking')
  const missing = p.accounts.filter(a => !a.kind)
  const groups = [
    { title: 'Что мешает импорту', entries: blockers, blocking: true },
    { title: 'Что изменится при переносе', entries: warnings, blocking: false },
  ]
  return <IonCard>
    <IonCardHeader><IonCardTitle>Проверка перед импортом</IonCardTitle></IonCardHeader>
    <IonCardContent>
      {missing.length > 0 && <p>Осталось выбрать тип счетов: {missing.length}. Заполните поля в разделе «Личные счета» выше — файл для этого менять не нужно.</p>}
      {groups.map(group => group.entries.length > 0 && <section key={group.title}>
        <h3>{group.title} ({group.entries.length})</h3>
        {group.blocking && <p>Исправьте указанные причины перед подтверждением. Эти записи не будут молча пропущены.</p>}
        <ul className="import-diagnostics">{group.entries.map((d, i) => {
          const copy = explain(p, d)
          return <li key={`${d.code}-${d.source_id}-${i}`}>
            <IonText color={group.blocking ? 'danger' : undefined}><strong>{copy.title}</strong></IonText>
            {copy.action && <p>{copy.action}</p>}
            {d.entity === 'Account' && p.accounts.some(a => a.source_id === d.source_id) &&
              <IonButton size="small" fill="outline" onClick={() => scrollToImportAccount(d.source_id)}>Перейти к счёту</IonButton>}
          </li>
        })}</ul>
      </section>)}
      {p.exclusions.length > 0 && <section>
        <h3>Будут пропущены записи: {p.exclusions.length}</h3>
        <p>Пропущенные операции не попадут в историю и могут повлиять на итоговые балансы. Проверьте балансы в предпросмотре.</p>
        <ul>{p.exclusions.map((e, i) => {
          const d = p.diagnostics.find(d => d.code === 'deleted_reference' && d.entity === e.entity && d.source_id === e.source_id)
          return <li key={`${e.source_id}-${i}`}><strong>{entityNames[e.entity] || 'Запись'} {i + 1}</strong><p>{d ? 'Связанный счёт или категория удалены в Monefy. Можно пропустить запись, подтвердив исключения ниже. Если запись нужна, сначала исправьте её связи в исходных данных и подготовьте новую копию.' : e.reason}</p></li>
        })}</ul>
      </section>}
      {Object.entries(p.deleted || {}).filter(([, count]) => count > 0).map(([entity, count]) => <p key={entity}>Уже удалены в Monefy и не переносятся: {entityNames[entity] || 'записи'} — {count}.</p>)}
      {(p.requires_exclusion_confirmation || p.diagnostics.some(d => d.severity === 'confirmation')) &&
        <IonCheckbox className="import-ack" checked={state.accepted} disabled={state.phase !== 'idle'} onIonChange={e => controller.accept(e.detail.checked)}>Принимаю все перечисленные исключения</IonCheckbox>}
      {!blockers.length && !warnings.length && !p.exclusions.length && !missing.length && <p>Препятствий и предупреждений нет.</p>}
      <details className="import-technical">
        <summary>Технические сведения для диагностики</summary>
        <ul>{p.diagnostics.map((d, i) => <li key={i}>{d.code} · {d.entity} · {d.source_id}: {d.message}</li>)}</ul>
        <ul>{p.exclusions.map((e, i) => <li key={i}>Пропуск {i + 1}: {e.entity} · {e.source_id} — {e.reason}</li>)}</ul>
      </details>
    </IonCardContent>
  </IonCard>
}
