import { PageHeader } from '@/components/layout/PageHeader'
import { AppContent } from '@/components/layout/AppContent'
import {
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  } from '@ionic/react'
import { peopleOutline, cashOutline, mailOutline } from 'ionicons/icons'

export function AdminPage() {
  return (
    <IonPage>
      <PageHeader title="Администрирование" backHref="/dashboard" />
      <AppContent>
        <IonCard routerLink="/admin/users" button>
          <IonCardHeader>
            <IonIcon icon={peopleOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
            <IonCardTitle>Пользователи</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            Управление учётными записями пользователей
          </IonCardContent>
        </IonCard>

        <IonCard routerLink="/admin/currencies" button>
          <IonCardHeader>
            <IonIcon icon={cashOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
            <IonCardTitle>Валюты</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            Настройка валют и обменных курсов
          </IonCardContent>
        </IonCard>

        <IonCard routerLink="/admin/invites" button>
          <IonCardHeader>
            <IonIcon icon={mailOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
            <IonCardTitle>Приглашения</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            Создание и управление приглашениями
          </IonCardContent>
        </IonCard>
      </AppContent>
    </IonPage>
  )
}
