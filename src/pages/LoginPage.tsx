import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
} from '@ionic/react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const history = useHistory()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, tokens } = await authApi.login(email, password)
      setAuth(tokens.accessToken, tokens.refreshToken, user)
      history.replace('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Вход</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ maxWidth: 400, margin: '0 auto', paddingTop: 32 }}>
          <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>
            co-wallet
          </h1>

          {error && (
            <IonText color="danger">
              <p style={{ marginBottom: 16 }}>{error}</p>
            </IonText>
          )}

          <form onSubmit={handleSubmit}>
            <IonList>
              <IonItem>
                <IonInput
                  label="Email"
                  labelPlacement="floating"
                  type="email"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  required
                  autocomplete="email"
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
                  autocomplete="current-password"
                />
              </IonItem>
            </IonList>

            <IonButton
              expand="block"
              type="submit"
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Войти'}
            </IonButton>
          </form>

          <IonText color="medium">
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem' }}>
              Доступ предоставляется по приглашению администратора.
            </p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  )
}
