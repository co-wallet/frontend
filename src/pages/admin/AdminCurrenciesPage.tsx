import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonButton, IonIcon, IonList, IonItem, IonLabel,
  IonNote, IonToggle, IonSpinner, IonModal, IonInput, IonText,
  IonFab, IonFabButton, IonItemGroup, IonItemDivider,
} from '@ionic/react'
import { refreshOutline, addOutline, cashOutline } from 'ionicons/icons'
import { adminApi, type AdminCurrency } from '@/api/admin'

function AddCurrencyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createCurrency({ code: code.toUpperCase(), name, symbol: symbol || undefined, isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'currencies'] }); onClose() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setApiError(err?.response?.data?.error ?? 'Ошибка при создании валюты')
    },
  })

  const handleSubmit = () => {
    setApiError(null)
    mutation.mutate()
  }

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      onWillPresent={() => {
        setCode(''); setName(''); setSymbol(''); setIsActive(true); setApiError(null)
      }}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Отмена</IonButton>
          </IonButtons>
          <IonTitle>Новая валюта</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSubmit} disabled={mutation.isPending || !code || !name}>
              {mutation.isPending ? <IonSpinner name="crescent" /> : 'Добавить'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonInput
              label="Код (ISO)"
              labelPlacement="stacked"
              value={code}
              onIonInput={(e) => setCode(e.detail.value ?? '')}
              maxlength={3}
              placeholder="USD"
              style={{ textTransform: 'uppercase' }}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Символ"
              labelPlacement="stacked"
              value={symbol}
              onIonInput={(e) => setSymbol(e.detail.value ?? '')}
              maxlength={5}
              placeholder="$"
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Название"
              labelPlacement="stacked"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
              placeholder="US Dollar"
            />
          </IonItem>
          <IonItem>
            <IonToggle
              checked={isActive}
              onIonChange={(e) => setIsActive(e.detail.checked)}
            >
              Активна
            </IonToggle>
          </IonItem>
        </IonList>
        {apiError && (
          <div className="ion-padding-horizontal">
            <IonText color="danger">
              <p style={{ fontSize: '0.85rem' }}>{apiError}</p>
            </IonText>
          </div>
        )}
      </IonContent>
    </IonModal>
  )
}

function CurrencyItem({ currency }: { currency: AdminCurrency }) {
  const qc = useQueryClient()
  const toggle = useMutation({
    mutationFn: () => adminApi.updateCurrency(currency.code, { isActive: !currency.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'currencies'] }),
  })

  return (
    <IonItem>
      <IonIcon icon={cashOutline} slot="start" color={currency.isActive ? 'success' : 'medium'} />
      <IonLabel>
        <h2>
          {currency.code}
          {currency.symbol && <span style={{ color: 'var(--ion-color-medium)', marginLeft: 4 }}>({currency.symbol})</span>}
        </h2>
        <p>{currency.name}</p>
      </IonLabel>
      {currency.rateToUsd > 0 && (
        <IonNote slot="end" style={{ marginRight: 8, fontSize: '0.75rem' }}>
          1 USD = {currency.rateToUsd.toFixed(4)}
        </IonNote>
      )}
      <IonToggle
        slot="end"
        checked={currency.isActive}
        disabled={toggle.isPending}
        onIonChange={() => toggle.mutate()}
      />
    </IonItem>
  )
}

export function AdminCurrenciesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['admin', 'currencies'],
    queryFn: adminApi.listCurrencies,
  })

  const refresh = useMutation({
    mutationFn: adminApi.refreshRates,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'currencies'] }),
  })

  const active = currencies.filter((c) => c.isActive)
  const inactive = currencies.filter((c) => !c.isActive)

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Валюты</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              {refresh.isPending ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} />}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <IonSpinner />
          </div>
        ) : (
          <IonList>
            {active.length > 0 && (
              <IonItemGroup>
                <IonItemDivider>
                  <IonLabel>Активные ({active.length})</IonLabel>
                </IonItemDivider>
                {active.map((c) => <CurrencyItem key={c.code} currency={c} />)}
              </IonItemGroup>
            )}
            {inactive.length > 0 && (
              <IonItemGroup>
                <IonItemDivider>
                  <IonLabel>Отключённые ({inactive.length})</IonLabel>
                </IonItemDivider>
                {inactive.map((c) => <CurrencyItem key={c.code} currency={c} />)}
              </IonItemGroup>
            )}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowAdd(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <AddCurrencyModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      </IonContent>
    </IonPage>
  )
}
