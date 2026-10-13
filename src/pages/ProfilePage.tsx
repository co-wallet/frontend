import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IonPage, IonList, IonItem, IonInput, IonButton, IonText, IonSpinner } from '@ionic/react'
import { authApi, type UpdateProfileReq } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppContent } from '@/components/layout/AppContent'
import './ProfilePage.css'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const queryClient = useQueryClient()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profilePassword, setProfilePassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState<'profile' | 'password' | null>(null)
  const [message, setMessage] = useState({ section: '', error: '', success: '' })
  const emailChanged = email.trim().toLowerCase() !== user?.email
  const profileChanged = username.trim() !== user?.username || emailChanged

  const save = async (section: 'profile' | 'password', request: UpdateProfileReq) => {
    setSaving(section)
    setMessage({ section, error: '', success: '' })
    try {
      const updated = await authApi.updateMe(request)
      updateUser(updated)
      // Other pages display usernames in account members and transfer destinations.
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['account-members'] })
      void queryClient.invalidateQueries({ queryKey: ['transfer-accounts'] })
      if (section === 'profile') {
        setUsername(updated.username)
        setEmail(updated.email)
        setProfilePassword('')
      } else {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmation('')
      }
      setMessage({ section, error: '', success: section === 'profile' ? 'Профиль сохранён' : 'Пароль изменён' })
    } catch (err: unknown) {
      const error = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMessage({ section, error: error ?? 'Не удалось сохранить изменения. Попробуйте ещё раз.', success: '' })
    } finally {
      setSaving(null)
    }
  }

  const submitProfile = (event: FormEvent) => {
    event.preventDefault()
    if (saving || !profileChanged) return
    const request: UpdateProfileReq = {}
    if (username.trim() !== user?.username) request.username = username.trim()
    if (emailChanged) {
      request.email = email.trim().toLowerCase()
      request.currentPassword = profilePassword
    }
    void save('profile', request)
  }
  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (newPassword !== confirmation) {
      setMessage({ section: 'password', error: 'Пароли не совпадают', success: '' })
      return
    }
    if (new TextEncoder().encode(newPassword).length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setMessage({ section: 'password', error: 'Пароль должен содержать от 8 до 72 байт', success: '' })
      return
    }
    void save('password', { currentPassword, newPassword })
  }
  const feedback = (section: string) => message.section === section && (
    <IonText color={message.error ? 'danger' : 'success'}>
      <p role={message.error ? 'alert' : 'status'}>{message.error || message.success}</p>
    </IonText>
  )

  return (
    <IonPage>
      <PageHeader title="Профиль" />
      <AppContent backHref="/dashboard">
        <div className="profile-page">
          <form onSubmit={submitProfile} aria-label="Личные данные">
            <h2>Личные данные</h2>
            <IonList>
              <IonItem><IonInput label="Имя" labelPlacement="stacked" value={username} maxlength={50}
                autocomplete="username" required disabled={saving !== null} onIonInput={(e) => setUsername(e.detail.value ?? '')} /></IonItem>
              <IonItem><IonInput label="Почта" labelPlacement="stacked" type="email" value={email} maxlength={255}
                autocomplete="email" required disabled={saving !== null} onIonInput={(e) => setEmail(e.detail.value ?? '')} /></IonItem>
              {emailChanged && <IonItem><IonInput label="Текущий пароль для смены почты" labelPlacement="stacked" type="password"
                autocomplete="current-password" value={profilePassword} required disabled={saving !== null}
                onIonInput={(e) => setProfilePassword(e.detail.value ?? '')} /></IonItem>}
            </IonList>
            {feedback('profile')}
            <IonButton expand="block" type="submit" disabled={saving !== null || !profileChanged || !username.trim() || !email.trim() || (emailChanged && !profilePassword)}>
              {saving === 'profile' ? <IonSpinner name="crescent" /> : 'Сохранить профиль'}
            </IonButton>
          </form>
          <form onSubmit={submitPassword} aria-label="Смена пароля">
            <h2>Смена пароля</h2>
            <IonList>
              <IonItem><IonInput label="Текущий пароль" labelPlacement="stacked" type="password" autocomplete="current-password"
                value={currentPassword} required disabled={saving !== null} onIonInput={(e) => setCurrentPassword(e.detail.value ?? '')} /></IonItem>
              <IonItem><IonInput label="Новый пароль" labelPlacement="stacked" type="password" autocomplete="new-password" minlength={8}
                value={newPassword} required disabled={saving !== null} onIonInput={(e) => setNewPassword(e.detail.value ?? '')} /></IonItem>
              <IonItem><IonInput label="Повторите новый пароль" labelPlacement="stacked" type="password" autocomplete="new-password"
                value={confirmation} required disabled={saving !== null} onIonInput={(e) => setConfirmation(e.detail.value ?? '')} /></IonItem>
            </IonList>
            <IonText color="medium"><p>Минимум 8 символов. После смены используйте новый пароль для входа.</p></IonText>
            {feedback('password')}
            <IonButton expand="block" type="submit" disabled={saving !== null || !currentPassword || !newPassword || !confirmation}>
              {saving === 'password' ? <IonSpinner name="crescent" /> : 'Изменить пароль'}
            </IonButton>
          </form>
        </div>
      </AppContent>
    </IonPage>
  )
}
