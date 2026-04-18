import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonBadge,
  IonButton, IonIcon, IonSpinner, IonText, IonFab, IonFabButton,
  IonModal, IonInput,
} from '@ionic/react'
import { addOutline, copyOutline, checkmarkOutline, mailOutline } from 'ionicons/icons'
import { invitesApi, type Invite } from '@/api/invites'

function statusOf(invite: Invite): 'accepted' | 'expired' | 'pending' {
  if (invite.usedAt) return 'accepted'
  if (new Date(invite.expiresAt) < new Date()) return 'expired'
  return 'pending'
}

const statusLabel: Record<ReturnType<typeof statusOf>, string> = {
  accepted: 'Принят',
  expired: 'Истёк',
  pending: 'Ожидает',
}

const statusColor: Record<ReturnType<typeof statusOf>, string> = {
  accepted: 'success',
  expired: 'medium',
  pending: 'warning',
}

function InviteItem({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false)
  const inviteURL = `${window.location.origin}/invite/${invite.token}`
  const status = statusOf(invite)

  const copy = () => {
    navigator.clipboard.writeText(inviteURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const subtitle = status === 'accepted'
    ? `Использован ${new Date(invite.usedAt!).toLocaleDateString('ru-RU')}`
    : status === 'expired'
      ? 'Истёк срок действия'
      : `Истекает ${new Date(invite.expiresAt).toLocaleDateString('ru-RU')}`

  return (
    <IonItem>
      <IonIcon icon={mailOutline} slot="start" color="primary" />
      <IonLabel>
        <h2>{invite.email}</h2>
        <p>{subtitle}</p>
      </IonLabel>
      <IonBadge slot="end" color={statusColor[status]} style={{ marginRight: status === 'pending' ? 8 : 0 }}>
        {statusLabel[status]}
      </IonBadge>
      {status === 'pending' && (
        <IonButton fill="clear" slot="end" onClick={copy} size="small">
          <IonIcon icon={copied ? checkmarkOutline : copyOutline} color={copied ? 'success' : 'medium'} />
        </IonButton>
      )}
    </IonItem>
  )
}

export function AdminInvitesPage() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [lastInviteURL, setLastInviteURL] = useState<string | null>(null)
  const [lastCopied, setLastCopied] = useState(false)
  const [apiError, setApiError] = useState('')

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: invitesApi.list,
  })

  const create = useMutation({
    mutationFn: () => invitesApi.create(email),
    onSuccess: ({ inviteUrl }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] })
      setLastInviteURL(inviteUrl)
      setEmail('')
      setShowForm(false)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setApiError(err?.response?.data?.error ?? 'Ошибка')
    },
  })

  const copyLastURL = () => {
    if (!lastInviteURL) return
    navigator.clipboard.writeText(lastInviteURL)
    setLastCopied(true)
    setTimeout(() => setLastCopied(false), 2000)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" text="Назад" />
          </IonButtons>
          <IonTitle>Приглашения</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {lastInviteURL && (
          <div className="ion-padding" style={{ background: 'var(--ion-color-success-tint)', borderBottom: '1px solid var(--ion-color-success-shade)' }}>
            <IonText color="success">
              <h3 style={{ margin: '0 0 4px' }}>Приглашение создано!</h3>
              <p style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>Отправьте эту ссылку пользователю:</p>
            </IonText>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--ion-background-color)', padding: '6px 8px', borderRadius: 6 }}>
                {lastInviteURL}
              </code>
              <IonButton fill="clear" size="small" onClick={copyLastURL}>
                <IonIcon icon={lastCopied ? checkmarkOutline : copyOutline} color={lastCopied ? 'success' : 'medium'} />
              </IonButton>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <IonSpinner />
          </div>
        ) : invites.length === 0 ? (
          <div className="ion-text-center ion-padding" style={{ paddingTop: 48 }}>
            <IonIcon icon={mailOutline} style={{ fontSize: 48, color: 'var(--ion-color-medium)' }} />
            <IonText color="medium">
              <p>Нет приглашений</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {invites.map((inv: Invite) => <InviteItem key={inv.id} invite={inv} />)}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setShowForm(true); setLastInviteURL(null); setApiError('') }}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showForm} onDidDismiss={() => setShowForm(false)} onWillPresent={() => { setEmail(''); setApiError('') }}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowForm(false)}>Отмена</IonButton>
              </IonButtons>
              <IonTitle>Новое приглашение</IonTitle>
              <IonButtons slot="end">
                <IonButton strong onClick={() => { setApiError(''); create.mutate() }} disabled={create.isPending || !email}>
                  {create.isPending ? <IonSpinner name="crescent" /> : 'Создать'}
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonInput
                  label="Email"
                  labelPlacement="floating"
                  type="email"
                  value={email}
                  placeholder="user@example.com"
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                />
              </IonItem>
            </IonList>
            {apiError && (
              <div className="ion-padding-top">
                <IonText color="danger">
                  <p style={{ fontSize: '0.85rem' }}>{apiError}</p>
                </IonText>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
