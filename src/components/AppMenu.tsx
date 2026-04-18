import { useHistory } from 'react-router-dom'
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonItemDivider,
} from '@ionic/react'
import {
  homeOutline,
  walletOutline,
  swapHorizontalOutline,
  folderOutline,
  pricetagOutline,
  shieldCheckmarkOutline,
  peopleOutline,
  cashOutline,
  mailOutline,
  logOutOutline,
  sunnyOutline,
  moonOutline,
  phonePortraitOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

const mainItems = [
  { label: 'Главная', icon: homeOutline, path: '/dashboard' },
  { label: 'Счета', icon: walletOutline, path: '/accounts' },
  { label: 'Транзакции', icon: swapHorizontalOutline, path: '/transactions' },
  { label: 'Категории', icon: folderOutline, path: '/categories' },
  { label: 'Теги', icon: pricetagOutline, path: '/tags' },
]

const adminItems = [
  { label: 'Админ-панель', icon: shieldCheckmarkOutline, path: '/admin' },
  { label: 'Пользователи', icon: peopleOutline, path: '/admin/users' },
  { label: 'Валюты', icon: cashOutline, path: '/admin/currencies' },
  { label: 'Приглашения', icon: mailOutline, path: '/admin/invites' },
]

const themeModes = [
  { mode: 'light' as const, icon: sunnyOutline, label: 'Светлая' },
  { mode: 'dark' as const, icon: moonOutline, label: 'Тёмная' },
  { mode: 'system' as const, icon: phonePortraitOutline, label: 'Системная' },
]

export function AppMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const history = useHistory()
  const themeMode = useThemeStore((s) => s.mode)
  const setThemeMode = useThemeStore((s) => s.setMode)

  const handleLogout = () => {
    logout()
    history.replace('/login')
  }

  const cycleTheme = () => {
    const idx = themeModes.findIndex((t) => t.mode === themeMode)
    const next = themeModes[(idx + 1) % themeModes.length]
    setThemeMode(next.mode)
  }

  const currentTheme = themeModes.find((t) => t.mode === themeMode) ?? themeModes[0]

  return (
    <IonMenu contentId="main-content" type="overlay">
      <IonHeader>
        <IonToolbar>
          <IonTitle>co-wallet</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList lines="none">
          {mainItems.map((item) => (
            <IonMenuToggle key={item.path} autoHide={false}>
              <IonItem routerLink={item.path} routerDirection="root" detail={false}>
                <IonIcon slot="start" icon={item.icon} />
                <IonLabel>{item.label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
        </IonList>

        {user?.isAdmin && (
          <>
            <IonItemDivider>
              <IonLabel>Администрирование</IonLabel>
            </IonItemDivider>
            <IonList lines="none">
              {adminItems.map((item) => (
                <IonMenuToggle key={item.path} autoHide={false}>
                  <IonItem routerLink={item.path} routerDirection="root" detail={false}>
                    <IonIcon slot="start" icon={item.icon} />
                    <IonLabel>{item.label}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
              ))}
            </IonList>
          </>
        )}

        <IonList lines="none" className="ion-margin-top">
          <IonItem button onClick={cycleTheme} detail={false}>
            <IonIcon slot="start" icon={currentTheme.icon} />
            <IonLabel>Тема: {currentTheme.label}</IonLabel>
          </IonItem>
          <IonMenuToggle autoHide={false}>
            <IonItem button onClick={handleLogout} detail={false}>
              <IonIcon slot="start" icon={logOutOutline} color="danger" />
              <IonLabel color="danger">Выйти</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </IonContent>
    </IonMenu>
  )
}
