import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonBadge, IonItemSliding,
  IonItemOptions, IonItemOption, IonModal, IonInput, IonButton, IonSpinner,
  IonText, IonAlert, IonIcon,
} from '@ionic/react'
import { shieldOutline, shieldCheckmarkOutline, keyOutline, personOutline } from 'ionicons/icons'
import { adminApi, type AdminUser } from '@/api/admin'

function ResetPasswordModal({
  user,
  isOpen,
  onClose,
}: {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => adminApi.updateUser(user!.id, { newPassword: password }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); onClose() },
  })

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} onWillPresent={() => { setPassword(''); mutation.reset() }}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Сброс пароля — {user?.username}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Отмена</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonInput
              type="password"
              label="Новый пароль"
              labelPlacement="floating"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value ?? '')}
              minlength={4}
            />
          </IonItem>
        </IonList>

        {mutation.isError && (
          <IonText color="danger">
            <p style={{ padding: '0 16px' }}>Ошибка при сбросе пароля</p>
          </IonText>
        )}

        <div style={{ padding: '16px' }}>
          <IonButton
            expand="block"
            disabled={password.length < 4 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <IonSpinner name="crescent" /> : 'Сохранить'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  )
}

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateUser(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const toggleAdmin = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      adminApi.updateUser(id, { isAdmin }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin" />
            </IonButtons>
            <IonTitle>Пользователи</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ textAlign: 'center' }}>
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Пользователи</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {users.map((u) => (
            <IonItemSliding key={u.id}>
              <IonItem>
                <IonIcon icon={personOutline} slot="start" />
                <IonLabel>
                  <h2>{u.username}</h2>
                  <p>{u.email}</p>
                  <p>{u.defaultCurrency} · {new Date(u.createdAt).toLocaleDateString('ru-RU')}</p>
                </IonLabel>
                <div slot="end" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {u.isAdmin && <IonBadge color="primary">admin</IonBadge>}
                  {!u.isActive && <IonBadge color="danger">заблокирован</IonBadge>}
                </div>
              </IonItem>

              <IonItemOptions side="start">
                <IonItemOption
                  color="warning"
                  onClick={() => setResetUser(u)}
                >
                  <IonIcon slot="icon-only" icon={keyOutline} />
                </IonItemOption>
              </IonItemOptions>

              <IonItemOptions side="end">
                <IonItemOption
                  color={u.isAdmin ? 'medium' : 'primary'}
                  onClick={() => toggleAdmin.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                >
                  <IonIcon slot="icon-only" icon={u.isAdmin ? shieldOutline : shieldCheckmarkOutline} />
                </IonItemOption>
                <IonItemOption
                  color={u.isActive ? 'danger' : 'success'}
                  onClick={() => {
                    if (u.isActive) {
                      setDeactivateUser(u)
                    } else {
                      toggleActive.mutate({ id: u.id, isActive: true })
                    }
                  }}
                >
                  {u.isActive ? 'Заблокировать' : 'Разблокировать'}
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>

        <ResetPasswordModal
          user={resetUser}
          isOpen={resetUser !== null}
          onClose={() => setResetUser(null)}
        />

        <IonAlert
          isOpen={deactivateUser !== null}
          header="Заблокировать пользователя"
          message={`Вы уверены, что хотите заблокировать ${deactivateUser?.username}?`}
          onDidDismiss={() => setDeactivateUser(null)}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: 'Заблокировать',
              role: 'destructive',
              handler: () => {
                if (deactivateUser) {
                  toggleActive.mutate({ id: deactivateUser.id, isActive: false })
                }
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}
