import { useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonInput, IonToggle,
  IonSpinner, IonText, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonAlert, IonNote,
} from '@ionic/react'
import { pencilOutline, trashOutline, peopleOutline, chevronForwardOutline } from 'ionicons/icons'
import { accountsApi } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'

export function AccountDetailPage() {
  const { accountID } = useParams<{ accountID: string }>()
  const qc = useQueryClient()
  const history = useHistory()
  const user = useAuthStore((s) => s.user)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editInclude, setEditInclude] = useState(true)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const { data: account, isLoading } = useQuery({
    queryKey: ['account', accountID],
    queryFn: () => accountsApi.get(accountID!),
  })

  const updateMutation = useMutation({
    mutationFn: () => accountsApi.update(accountID!, { name: editName, includeInBalance: editInclude }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', accountID] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => accountsApi.delete(accountID!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      history.push('/accounts')
    },
  })

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/accounts" text="Счета" />
            </IonButtons>
            <IonTitle>Счёт</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    )
  }

  if (!account) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/accounts" text="Счета" />
            </IonButtons>
            <IonTitle>Счёт</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p style={{ textAlign: 'center', marginTop: '2rem' }}>Счёт не найден</p>
          </IonText>
        </IonContent>
      </IonPage>
    )
  }

  const isOwner = account.ownerId === user?.id

  const startEdit = () => {
    setEditName(account.name)
    setEditInclude(account.includeInBalance)
    setEditing(true)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/accounts" text="Счета" />
          </IonButtons>
          <IonTitle>{account.name}</IonTitle>
          <IonButtons slot="end">
            {!editing && (
              <IonButton onClick={startEdit}>
                <IonIcon slot="icon-only" icon={pencilOutline} />
              </IonButton>
            )}
            {!editing && isOwner && (
              <IonButton color="danger" onClick={() => setShowDeleteAlert(true)}>
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {editing ? (
          <>
            <IonList inset>
              <IonItem>
                <IonInput
                  label="Название"
                  labelPlacement="floating"
                  value={editName}
                  onIonInput={(e) => setEditName(e.detail.value ?? '')}
                />
              </IonItem>
              <IonItem>
                <IonToggle
                  checked={editInclude}
                  onIonChange={(e) => setEditInclude(e.detail.checked)}
                >
                  Учитывать в балансе
                </IonToggle>
              </IonItem>
            </IonList>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <IonButton expand="block" color="medium" onClick={() => setEditing(false)} style={{ flex: 1 }}>
                Отмена
              </IonButton>
              <IonButton
                expand="block"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                style={{ flex: 1 }}
              >
                {updateMutation.isPending ? <IonSpinner name="crescent" /> : 'Сохранить'}
              </IonButton>
            </div>
          </>
        ) : (
          <>
            <IonCard>
              <IonCardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>{account.icon ?? '💳'}</span>
                  <div>
                    <IonCardTitle>{account.name}</IonCardTitle>
                    <IonNote>
                      {account.type === 'shared' ? 'Совместный' : 'Личный'} · {account.currency}
                    </IonNote>
                  </div>
                </div>
              </IonCardHeader>
              <IonCardContent>
                {!account.includeInBalance && (
                  <IonText color="medium">
                    <p style={{ fontSize: '0.85rem' }}>Не учитывается в балансе</p>
                  </IonText>
                )}
              </IonCardContent>
            </IonCard>

            {account.type === 'shared' && (
              <IonList inset>
                <IonItem button routerLink={`/accounts/${accountID}/members`} detail>
                  <IonIcon icon={peopleOutline} slot="start" color="medium" />
                  <IonLabel>
                    <h2>Участники</h2>
                    {account.members && (
                      <p>{account.members.length} чел.</p>
                    )}
                  </IonLabel>
                  <IonIcon icon={chevronForwardOutline} slot="end" color="medium" />
                </IonItem>
              </IonList>
            )}
          </>
        )}

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Удалить счёт?"
          message="Это действие нельзя отменить."
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: 'Удалить',
              role: 'destructive',
              handler: () => deleteMutation.mutate(),
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}
