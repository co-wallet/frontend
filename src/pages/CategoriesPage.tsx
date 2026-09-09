import { EntityFormHeader, EntityFormSection, EntityFormError } from '@/components/EntityForm'
import { AppContent } from '@/components/layout/AppContent'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonIcon,
  IonMenuButton, IonButtons, IonSpinner, IonText,
  IonAlert, IonModal, IonInput, IonButton,
  IonSegment, IonSegmentButton, IonFab, IonFabButton,
} from '@ionic/react';
import {
  folderOutline, addOutline,
} from 'ionicons/icons';
import { categoriesApi, Category, CategoryType, CreateCategoryReq } from '../api/categories';
import { CategoryList } from '../components/CategoryList';
import {
  defaultCategoryIconValue,
  normalizeCategoryIconValue,
} from '../components/CategoryIcon';
import { CategoryIconSettings } from '../components/CategoryIconSettings';

import './CategoriesPage.css';
import axios from 'axios';

function emptyFormData(type: CategoryType) {
  return {
    name: '',
    icon: defaultCategoryIconValue(type),
  };
}

export default function CategoriesPage() {
  const [showHidden, setShowHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => emptyFormData('expense'));
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', activeTab],
    queryFn: () => categoriesApi.list(activeTab),
  });

  const hiddenCount = categories.filter((category) => category.hidden).length;
  const visibleCategories = categories.filter((category) => showHidden || !category.hidden);

  function invalidateCategoryConsumers() {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  }

  const createMutation = useMutation({
    mutationFn: (req: CreateCategoryReq) => categoriesApi.create(req),
    onSuccess: () => {
      invalidateCategoryConsumers();
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, icon }: { id: string; name: string; icon: string }) =>
      categoriesApi.update(id, { name, icon: icon || null }),
    onSuccess: () => {
      invalidateCategoryConsumers();
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: invalidateCategoryConsumers,
  });

  const visibilityMutation = useMutation({
    mutationFn: (category: Category) => categoriesApi.setHidden(category.id, !category.hidden),
    onSuccess: invalidateCategoryConsumers,
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyFormData(activeTab));
  }

  function handleCreate() {
    createMutation.reset();
    updateMutation.reset();
    setEditingId(null);
    setFormData(emptyFormData(activeTab));
    setShowForm(true);
  }

  function handleEdit(cat: Category) {
    createMutation.reset();
    updateMutation.reset();
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      icon: normalizeCategoryIconValue(cat.icon, cat.type),
    });
    setShowForm(true);
  }

  function handleDelete(category: Category) {
    deleteMutation.reset();
    setDeleteTarget(category);
  }

  function handleSubmit() {
    if (!formData.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, name: formData.name, icon: formData.icon });
    } else {
      createMutation.mutate({
        name: formData.name,
        type: activeTab,
        icon: formData.icon || null,
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Категории</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={activeTab}
            onIonChange={e => setActiveTab(e.detail.value as CategoryType)}
          >
            <IonSegmentButton value="expense">Расходы</IonSegmentButton>
            <IonSegmentButton value="income">Доходы</IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <AppContent withFab
        fixed={
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton aria-label="Добавить категорию" onClick={() => handleCreate()}>
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        }
      >
        <IonText color="medium"><p>Общий справочник. Изменения видны всем. Скрытие действует только для вас.</p></IonText>
        {hiddenCount > 0 && <IonButton fill="outline" onClick={() => setShowHidden(!showHidden)} aria-expanded={showHidden}>
          {showHidden ? 'Не показывать скрытые' : `Показать скрытые категории (${hiddenCount})`}
        </IonButton>}
        {visibilityMutation.error && <IonText color="danger"><p>Не удалось изменить видимость. Попробуйте ещё раз.</p></IonText>}
        {isLoading ? (
          <div className="app-state">
            <IonSpinner />
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="app-state">
            <IonIcon icon={folderOutline} />
            <IonText color="medium">
              <p>{hiddenCount > 0 ? 'Все категории скрыты. Нажмите «Показать скрытые категории», чтобы вернуть их в список.' : 'Нет категорий. Создайте первую!'}</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            <CategoryList
              categories={visibleCategories}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleHidden={(category) => visibilityMutation.mutate(category)}
              visibilityPending={visibilityMutation.isPending}
            />
          </IonList>
        )}

        {deleteMutation.error && (
          <IonText color="danger" className="category-page-error">
            <p>{axios.isAxiosError(deleteMutation.error) && deleteMutation.error.response?.status === 409
              ? 'Категория используется в операциях. Её можно скрыть для себя.'
              : 'Не удалось удалить категорию. Попробуйте ещё раз.'}</p>
          </IonText>
        )}

        {/* Add/Edit Modal */}
        <IonModal isOpen={showForm} onDidDismiss={resetForm}>
          <EntityFormHeader title={editingId ? 'Изменить категорию' : 'Новая категория'}
            onCancel={resetForm} onSubmit={handleSubmit}
            pending={createMutation.isPending || updateMutation.isPending} disabled={!formData.name.trim()} />
          <AppContent>
            <EntityFormSection title="Основное">
              <IonItem>
                <IonInput
                  label="Название"
                  labelPlacement="stacked"
                  value={formData.name}
                  onIonInput={e => setFormData(f => ({ ...f, name: e.detail.value ?? '' }))}
                />
              </IonItem>

              <CategoryIconSettings
                value={formData.icon}
                type={activeTab}
                sessionKey={showForm ? (editingId ?? `new-${activeTab}`) : 'closed'}
                onChange={(icon) => setFormData((current) => ({ ...current, icon }))}
              />
            </EntityFormSection>
            <EntityFormError>{(createMutation.error || updateMutation.error) ? 'Ошибка. Попробуйте ещё раз.' : null}</EntityFormError>
          </AppContent>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          cssClass="app-alert"
          isOpen={!!deleteTarget}
          onDidDismiss={() => setDeleteTarget(null)}
          header="Удалить категорию?"
          message={`Удалить категорию "${deleteTarget?.name}" из общего справочника? Это возможно, только если она не используется в операциях.`}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            { text: 'Удалить', role: 'destructive', handler: handleDeleteConfirm },
          ]}
        />
      </AppContent>
    </IonPage>
  );
}
