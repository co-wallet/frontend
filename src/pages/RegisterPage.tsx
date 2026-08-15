import { useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
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
  IonNote,
} from '@ionic/react'
import { authApi } from '@/api/auth'

export function RegisterPage() {
  const history = useHistory()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }
    setLoading(true)
    try {
      await authApi.register(username, email, password)
      history.replace('/login', { registered: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Регистрация</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {error && (
          <IonText color="danger">
            <p style={{ margin: '0 0 16px' }}>{error}</p>
          </IonText>
        )}

        <form onSubmit={handleSubmit}>
          <IonList>
            <IonItem>
              <IonInput
                label="Имя пользователя"
                labelPlacement="floating"
                type="text"
                value={username}
                onIonInput={(e) => setUsername(e.detail.value ?? '')}
                required
                autocomplete="username"
              />
            </IonItem>
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
                minlength={8}
                autocomplete="new-password"
              />
            </IonItem>
          </IonList>
          <IonNote style={{ display: 'block', marginTop: 4, marginBottom: 16, paddingLeft: 16 }}>
            Минимум 8 символов
          </IonNote>

          <IonButton expand="block" type="submit" disabled={loading}>
            {loading ? <IonSpinner name="crescent" /> : 'Создать аккаунт'}
          </IonButton>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: 'var(--ion-color-primary)', fontWeight: 500 }}>
            Войти
          </Link>
        </p>
      </IonContent>
    </IonPage>
  )
}
