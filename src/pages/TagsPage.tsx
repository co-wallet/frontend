import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonNote, IonIcon,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonMenuButton, IonButtons, IonSpinner, IonText,
  IonAlert, IonModal, IonInput, IonButton,
} from '@ionic/react'
import { pricetagOutline, createOutline, trashOutline } from 'ionicons/icons'
import axios from 'axios'
import { tagsApi } from '@/api/tags'

export function TagsPage() {
  const qc = useQueryClient()
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTag, setDeleteTag] = useState<{ id: string; name: string; txCount: number } | null>(null)
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  })

  function invalidateTagConsumers() {
    qc.invalidateQueries({ queryKey: ['tags'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsApi.rename(id, name),
    onSuccess: () => {
      invalidateTagConsumers()
      setEditingTag(null)
      setEditError(null)
    },
    onError: (err: unknown) => {
      const message = axios.isAxiosError<{ error?: string }>(err)
        ? err.response?.data?.error
        : undefined
      setEditError(message ?? 'Не удалось сохранить тег')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: invalidateTagConsumers,
  })

  function handleEditOpen(id: string, name: string) {
    setEditName(name)
    setEditError(null)
    setEditingTag({ id, name })
    if (slidingRef.current) slidingRef.current.close()
  }

  function handleEditSave() {
    if (!editingTag || !editName.trim()) return
    renameMutation.mutate({ id: editingTag.id, name: editName })
  }

  function handleDeleteConfirm() {
    if (!deleteTag) return
    deleteMutation.mutate(deleteTag.id)
    setDeleteTag(null)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Теги</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <IonSpinner />
          </div>
        ) : tags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <IonIcon icon={pricetagOutline} style={{ fontSize: '40px', opacity: 0.3, marginBottom: '12px' }} />
            <IonText color="medium">
              <p>Нет тегов. Добавьте теги к транзакциям.</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {tags.map((tag) => (
              <IonItemSliding
                key={tag.id}
                ref={(el) => { slidingRef.current = el }}
              >
                <IonItem>
                  <IonIcon icon={pricetagOutline} slot="start" color="primary" />
                  <IonLabel>#{tag.name}</IonLabel>
                  {tag.txCount !== undefined && (
                    <IonNote slot="end">{tag.txCount} транз.</IonNote>
                  )}
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption color="primary" onClick={() => handleEditOpen(tag.id, tag.name)}>
                    <IonIcon slot="icon-only" icon={createOutline} />
                  </IonItemOption>
                  <IonItemOption
                    color="danger"
                    onClick={() => {
                      setDeleteTag({ id: tag.id, name: tag.name, txCount: tag.txCount ?? 0 })
                      if (slidingRef.current) slidingRef.current.close()
                    }}
                  >
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        {/* Edit Modal */}
        <IonModal isOpen={!!editingTag} onDidDismiss={() => setEditingTag(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Переименовать тег</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setEditingTag(null)}>Отмена</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonInput
                  label="Название"
                  labelPlacement="floating"
                  value={editName}
                  onIonInput={(e) => {
                    setEditName(e.detail.value ?? '')
                    if (editError) setEditError(null)
                  }}
                />
              </IonItem>
            </IonList>
            {editError && (
              <IonText color="danger">
                <p style={{ padding: '0 16px' }}>{editError}</p>
              </IonText>
            )}
            <IonButton
              expand="block"
              style={{ marginTop: '16px' }}
              onClick={handleEditSave}
              disabled={renameMutation.isPending || !editName.trim()}
            >
              {renameMutation.isPending ? <IonSpinner name="crescent" /> : 'Сохранить'}
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={!!deleteTag}
          onDidDismiss={() => setDeleteTag(null)}
          header="Удалить тег?"
          message={
            deleteTag && deleteTag.txCount > 0
              ? `Тег #${deleteTag.name} будет удалён из ${deleteTag.txCount} транзакций. Продолжить?`
              : `Удалить тег #${deleteTag?.name}?`
          }
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            { text: 'Удалить', role: 'destructive', handler: handleDeleteConfirm },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}
