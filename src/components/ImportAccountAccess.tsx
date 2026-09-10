import { IonItem, IonSelect, IonSelectOption } from '@ionic/react'
import type { ImportPreview } from '@/api/monefy'
import type { ImportState, MonefyImport } from '@/lib/monefyImport'
import { useAuthStore } from '@/store/authStore'
import { AccountMembersFields } from './AccountMembersFields'
import { buildAccountMembers } from '@/lib/accountMembers'

export function ImportAccountAccess({ account: a, state, controller }: { account: ImportPreview['accounts'][number]; state: ImportState; controller: MonefyImport }) {
  const owner = useAuthStore(s => s.user?.username) || ''
  const draft = state.accessDrafts?.[a.source_id]
  const mode = draft?.mode || a.access_mode || 'personal'
  const members = draft?.members || (a.members || []).map(m => ({ username: m.username || owner, share: String(m.default_share) }))
  const locked = state.phase !== 'idle'
  return <>
    <IonItem lines="none"><IonSelect label={`Доступ к счёту «${a.name}»`} labelPlacement="stacked" interface="alert" cancelText="Отмена" okText="Выбрать" value={mode} disabled={locked}
      onIonChange={e => controller.editAccess(a.source_id, e.detail.value, e.detail.value === 'shared' ? [{ username: owner, share: '1' }] : [])}>
      <IonSelectOption value="personal">Личный</IonSelectOption><IonSelectOption value="shared">Совместный</IonSelectOption>
    </IonSelect></IonItem>
    {mode === 'shared' && <>
      <fieldset className="import-access-fields" disabled={locked}><AccountMembersFields disabled={locked} value={members} ownerUsername={owner} error={buildAccountMembers(members, owner).error}
        onChange={value => controller.editAccess(a.source_id, 'shared', value)} /></fieldset>
      <p>Выбранные пропорции применяются ко всей переносимой истории этого счёта, включая начальный остаток и переводы. После импорта режим, участники и доли неизменяемы. Полная замена истории при наличии совместного счёта недоступна.</p>
    </>}
    {draft ? <p>Распределение изменено. Обновите предпросмотр перед подтверждением.</p> : mode === 'shared' && a.members?.every(m => m.final_balance !== '') && <ul>
      {a.members?.map(m => <li key={m.user_id}>{m.username || owner} · {Number((m.default_share * 100).toFixed(2))}%: начальный остаток {m.initial_balance} {a.currency}; итоговый остаток {m.final_balance} {a.currency}</li>)}
    </ul>}
  </>
}
