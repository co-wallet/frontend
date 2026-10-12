import { IonFab, IonFabButton, IonIcon } from '@ionic/react'
import { arrowBackOutline } from 'ionicons/icons'
import { usePageBack } from './usePageBack'

export function PageBackFab({ backHref }: { backHref: string }) {
  const goBack = usePageBack(backHref)
  return (
    <IonFab slot="fixed" vertical="bottom" horizontal="start" className="page-back-fab">
      <IonFabButton aria-label="Назад" title="Назад" onClick={goBack}>
        <IonIcon icon={arrowBackOutline} aria-hidden="true" />
      </IonFabButton>
    </IonFab>
  )
}
