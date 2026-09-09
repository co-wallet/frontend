import { EntityFormHeader, EntityFormSection, EntityFormError } from '@/components/EntityForm'
import { AppContent } from '@/components/layout/AppContent'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonIcon, IonRouterLink,
  IonMenuButton, IonButtons, IonSpinner, IonText,
  IonAlert, IonModal, IonInput, IonButton, IonFab, IonFabButton,
} from '@ionic/react'
import { pricetagOutline, createOutline, trashOutline, addOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons'
import axios from 'axios'
import { tagsApi, type Tag } from '@/api/tags'
import { usePeriodStore } from '@/store/periodStore'
import { filteredTransactionsHref } from '@/lib/transactionNavigation'
import './TagsPage.css'

export function TagsPage() {
  const qc = useQueryClient()
  const period = usePeriodStore()
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTag, setDeleteTag] = useState<{ id: string; name: string; txCount: number } | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  })

  const hiddenCount = tags.filter((tag) => tag.hidden).length
  const visibleTags = tags.filter((tag) => showHidden || !tag.hidden)

  function invalidateTagConsumers() {
    qc.invalidateQueries({ queryKey: ['tags'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  const visibilityMutation = useMutation({
    mutationFn: (tag: Tag) => tagsApi.setHidden(tag.id, !tag.hidden),
    onSuccess: invalidateTagConsumers,
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => id ? tagsApi.rename(id, name) : tagsApi.create(name),
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
      <AppContent withFab fixed={
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton aria-label="Добавить тег" onClick={() => handleEditOpen('', '')}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      }>
        <IonText color="medium"><p>Общий справочник. Изменения видны всем. Скрытие действует только для вас.</p></IonText>
        {hiddenCount > 0 && <IonButton fill="outline" onClick={() => setShowHidden(!showHidden)} aria-expanded={showHidden}>
          {showHidden ? 'Не показывать скрытые' : `Показать скрытые теги (${hiddenCount})`}
        </IonButton>}
        {visibilityMutation.error && <IonText color="danger"><p>Не удалось изменить видимость. Попробуйте ещё раз.</p></IonText>}
        {deleteMutation.error && <IonText color="danger"><p>{axios.isAxiosError(deleteMutation.error) && deleteMutation.error.response?.status === 409
          ? 'Тег используется в операциях. Его можно скрыть для себя.'
          : 'Не удалось удалить тег. Попробуйте ещё раз.'}</p></IonText>}
        {isLoading ? (
          <div className="app-state">
            <IonSpinner />
          </div>
        ) : visibleTags.length === 0 ? (
          <div className="app-state">
            <IonIcon icon={pricetagOutline} />
            <IonText color="medium">
              <p>{hiddenCount > 0 ? 'Все теги скрыты. Нажмите «Показать скрытые теги», чтобы вернуть их в список.' : 'Нет тегов. Добавьте теги к транзакциям.'}</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {visibleTags.map((tag) => (
              <IonItem key={tag.id} className="tag-list-row">
                <IonIcon icon={pricetagOutline} slot="start" color="primary" />
                <IonLabel className="tag-list-row__label">
                  <IonRouterLink
                    className="tag-list-row__link"
                    routerLink={filteredTransactionsHref({ tagIds: [tag.id] }, period)}
                    routerDirection="forward"
                    aria-label={`Транзакции с тегом ${tag.name}`}
                  >
                    <h2>#{tag.name}</h2>
                    {tag.txCount !== undefined && <p>Транзакций: {tag.txCount}</p>}
                    {tag.hidden && <p>Скрыт для меня</p>}
                  </IonRouterLink>
                </IonLabel>
                <IonButtons slot="end" className="tag-list-row__actions">
                  <IonButton fill="clear" color="medium" disabled={visibilityMutation.isPending}
                    title={tag.hidden ? 'Вернуть тег в список' : 'Скрыть тег для себя'}
                    aria-label={`${tag.hidden ? 'Показать' : 'Скрыть'} тег ${tag.name}`}
                    onClick={() => visibilityMutation.mutate(tag)}>
                    <IonIcon slot="icon-only" icon={tag.hidden ? eyeOutline : eyeOffOutline} />
                  </IonButton>
                  <IonButton fill="clear" color="primary" title="Редактировать тег"
                    aria-label={`Редактировать тег ${tag.name}`} onClick={() => handleEditOpen(tag.id, tag.name)}>
                    <IonIcon slot="icon-only" icon={createOutline} />
                  </IonButton>
                  <IonButton fill="clear" color="danger" title="Удалить тег"
                    aria-label={`Удалить тег ${tag.name}`}
                    onClick={() => {
                      deleteMutation.reset()
                      setDeleteTag({ id: tag.id, name: tag.name, txCount: tag.txCount ?? 0 })
                    }}>
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonButton>
                </IonButtons>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Edit Modal */}
        <IonModal isOpen={!!editingTag} onDidDismiss={() => setEditingTag(null)}>
          <EntityFormHeader title={editingTag?.id ? 'Переименовать тег' : 'Новый тег'}
            onCancel={() => setEditingTag(null)} onSubmit={handleEditSave}
            pending={renameMutation.isPending} disabled={!editName.trim()} />
          <AppContent>
            <EntityFormSection title="Основное">
              <IonItem>
                <IonInput
                  label="Название"
                  labelPlacement="stacked"
                  value={editName}
                  onIonInput={(e) => {
                    setEditName(e.detail.value ?? '')
                    if (editError) setEditError(null)
                  }}
                />
              </IonItem>
            </EntityFormSection>
            <EntityFormError>{editError}</EntityFormError>
          </AppContent>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={!!deleteTag}
          onDidDismiss={() => setDeleteTag(null)}
          header="Удалить тег?"
          message={`Удалить тег #${deleteTag?.name} из общего справочника? Это возможно, только если он не используется в операциях.`}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            { text: 'Удалить', role: 'destructive', handler: handleDeleteConfirm },
          ]}
        />
      </AppContent>
    </IonPage>
  )
}
