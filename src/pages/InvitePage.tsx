import { useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  IonSpinner,
} from '@ionic/react'
import { invitesApi } from '@/api/invites'
import { currenciesApi } from '@/api/currencies'
import { useAuthStore } from '@/store/authStore'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const history = useHistory()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [error, setError] = useState('')

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => invitesApi.validate(token!),
    retry: false,
  })

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies-public'],
    queryFn: () => currenciesApi.list(),
    staleTime: 60_000,
  })

  const accept = useMutation({
    mutationFn: () => invitesApi.accept(token!, username, password, defaultCurrency),
    onSuccess: ({ user, tokens }) => {
      setAuth(tokens.accessToken, tokens.refreshToken, user)
      history.replace('/dashboard')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? 'Ошибка при создании аккаунта')
    },
  })

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Приглашение</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ paddingTop: 64 }}>
            <IonSpinner name="crescent" />
            <IonText color="medium">
              <p>Проверяем ссылку...</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    )
  }

  if (isError || !invite) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Приглашение</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ maxWidth: 400, margin: '0 auto', paddingTop: 32 }}>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle color="danger">Ссылка недействительна</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText color="medium">
                  <p>
                    Приглашение уже использовано или истёк срок действия.
                    Попросите администратора выслать новое.
                  </p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </div>
        </IonContent>
      </IonPage>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Приглашение</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ maxWidth: 400, margin: '0 auto', paddingTop: 16 }}>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Создание аккаунта</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ marginBottom: 16 }}>
                  Вас пригласили в co-wallet. Аккаунт будет привязан к <strong>{invite.email}</strong>.
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>

          {error && (
            <IonText color="danger">
              <p style={{ margin: '8px 16px' }}>{error}</p>
            </IonText>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setError(''); accept.mutate() }}>
            <IonList>
              <IonItem>
                <IonInput
                  label="Имя пользователя"
                  labelPlacement="floating"
                  value={username}
                  onIonInput={(e) => setUsername(e.detail.value ?? '')}
                  required
                  placeholder="myname"
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Пароль"
                  labelPlacement="floating"
                  type="password"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  required
                  minlength={8}
                  placeholder="Минимум 8 символов"
                />
              </IonItem>
              <IonItem>
                <IonSelect
                  label="Валюта по умолчанию"
                  labelPlacement="floating"
                  value={defaultCurrency}
                  onIonChange={(e) => setDefaultCurrency(e.detail.value)}
                >
                  {currencies.length > 0
                    ? currencies.map((c) => (
                        <IonSelectOption key={c.code} value={c.code}>
                          {c.code} — {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                        </IonSelectOption>
                      ))
                    : <IonSelectOption value="USD">USD</IonSelectOption>
                  }
                </IonSelect>
              </IonItem>
            </IonList>

            <IonButton
              expand="block"
              type="submit"
              disabled={accept.isPending}
              style={{ marginTop: 16 }}
            >
              {accept.isPending ? <IonSpinner name="crescent" /> : 'Создать аккаунт'}
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  )
}
