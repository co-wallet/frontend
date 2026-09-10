import { useQuery } from '@tanstack/react-query'
import { IonItem, IonInput, IonNote, IonButton, IonSelectOption } from '@ionic/react'
import { EntityFormSection, EntityFormSelect, EntityFormError } from './EntityForm'
import { authApi } from '@/api/auth'
import { type MemberDraft } from '@/lib/accountMembers'
import { filterDecimalInput } from '@/lib/decimal'

export function AccountMembersFields({ value, onChange, ownerUsername, error }: {
  value: MemberDraft[]; onChange: (members: MemberDraft[]) => void; ownerUsername: string; error?: string
}) {
  const { data: users = [], isLoading, isError } = useQuery({ queryKey: ['users'], queryFn: authApi.listUsers, staleTime: 60_000 })
  return <EntityFormSection title="Участники и доли">
    <IonNote className="entity-form-note">Доли от 0 до 1, в сумме ровно 1. Например: 0,6 и 0,4.</IonNote>
    {value.map((member, index) => <div key={index}>
      <IonItem>
        {member.username === ownerUsername ? <IonNote>{ownerUsername} · Владелец</IonNote>
          : <EntityFormSelect label={`Участник ${index + 1}`} value={member.username} onIonChange={(e) => onChange(value.map((m, i) => i === index ? { ...m, username: e.detail.value } : m))}>
            {users.filter((u) => u.username === member.username || !value.some((m) => m.username === u.username)).map((u) => <IonSelectOption key={u.id} value={u.username}>{u.username}</IonSelectOption>)}
          </EntityFormSelect>}
      </IonItem>
      <IonItem>
        <IonInput label={`Доля ${member.username || index + 1}`} labelPlacement="stacked" inputMode="decimal" value={member.share}
          onIonInput={(e) => onChange(value.map((m, i) => i === index ? { ...m, share: filterDecimalInput(e.detail.value ?? '') } : m))} />
        {member.username !== ownerUsername && <IonButton fill="clear" color="danger" aria-label={`Убрать участника ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))}>Убрать</IonButton>}
      </IonItem>
    </div>)}
    <IonButton fill="clear" disabled={isLoading || isError || value.some((m) => !m.username) || !users.some((u) => !value.some((m) => m.username === u.username))}
      onClick={() => onChange([...value, { username: '', share: '0' }])}>Добавить участника</IonButton>
    <EntityFormError>{isError ? 'Не удалось загрузить пользователей.' : error}</EntityFormError>
  </EntityFormSection>
}
