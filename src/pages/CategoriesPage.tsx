import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
  IonMenuButton, IonButtons, IonSpinner, IonText,
  IonAlert, IonModal, IonInput, IonButton,
  IonSegment, IonSegmentButton, IonFab, IonFabButton,
} from '@ionic/react';
import {
  folderOpenOutline, folderOutline, addOutline,
} from 'ionicons/icons';
import { categoriesApi, CategoryNode, CategoryType, CreateCategoryReq } from '../api/categories';
import { CategoryTree } from '../components/CategoryTree';
import {
  defaultCategoryIconValue,
  normalizeCategoryIconValue,
} from '../components/CategoryIcon';
import { CategoryIconSettings } from '../components/CategoryIconSettings';

import './CategoriesPage.css';

function emptyFormData(type: CategoryType) {
  return {
    name: '',
    parentId: '',
    icon: defaultCategoryIconValue(type),
  };
}

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; parentId: string; icon: string }>(
    emptyFormData('expense'),
  );
  const [parentName, setParentName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', activeTab],
    queryFn: () => categoriesApi.list(activeTab),
  });

  useEffect(() => {
    const ids = new Set<string>();
    function collect(nodes: CategoryNode[]) {
      for (const n of nodes) {
        if (n.children?.length) {
          ids.add(n.id);
          collect(n.children);
        }
      }
    }
    collect(categories);
    setExpanded(ids);
  }, [categories]);

  function invalidateCategoryConsumers() {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  }

  const createMutation = useMutation({
    mutationFn: (req: CreateCategoryReq) => categoriesApi.create(req),
    onSuccess: (_, variables) => {
      invalidateCategoryConsumers();
      if (variables.parentId) {
        setExpanded((current) => new Set(current).add(variables.parentId!));
      }
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

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setParentName(null);
    setFormData(emptyFormData(activeTab));
  }

  function handleCreate(parent?: CategoryNode) {
    setEditingId(null);
    setParentName(parent?.name ?? null);
    setFormData({
      ...emptyFormData(activeTab),
      parentId: parent?.id ?? '',
    });
    setShowForm(true);
  }

  function handleEdit(cat: CategoryNode) {
    setEditingId(cat.id);
    setParentName(null);
    setFormData({
      name: cat.name,
      parentId: cat.parentId ?? '',
      icon: normalizeCategoryIconValue(cat.icon, cat.type),
    });
    setShowForm(true);
  }

  function handleDelete(category: CategoryNode) {
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
        parentId: formData.parentId || null,
        icon: formData.icon || null,
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      <IonContent>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <IonSpinner />
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <IonIcon icon={folderOutline} style={{ fontSize: '40px', opacity: 0.3, marginBottom: '12px' }} />
            <IonText color="medium">
              <p>Нет категорий. Создайте первую!</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            <CategoryTree
              nodes={categories}
              expanded={expanded}
              onToggle={toggleExpand}
              onAddChild={handleCreate}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </IonList>
        )}

        {deleteMutation.error && (
          <IonText color="danger" className="category-page-error">
            <p>Не удалось удалить категорию. Попробуйте ещё раз.</p>
          </IonText>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton aria-label="Добавить корневую категорию" onClick={() => handleCreate()}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Add/Edit Modal */}
        <IonModal isOpen={showForm} onDidDismiss={resetForm}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                {editingId
                  ? 'Изменить категорию'
                  : parentName
                    ? 'Новая подкатегория'
                    : 'Новая категория'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={resetForm}>Отмена</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonInput
                  label="Название"
                  labelPlacement="floating"
                  value={formData.name}
                  onIonInput={e => setFormData(f => ({ ...f, name: e.detail.value ?? '' }))}
                />
              </IonItem>
              {!editingId && parentName && (
                <IonItem className="category-parent-context">
                  <IonIcon slot="start" icon={folderOpenOutline} color="primary" />
                  <IonLabel>
                    <p>Родительская категория</p>
                    <h2>{parentName}</h2>
                  </IonLabel>
                </IonItem>
              )}
            </IonList>

            <CategoryIconSettings
              value={formData.icon}
              type={activeTab}
              sessionKey={editingId ?? `new-${activeTab}`}
              onChange={(icon) => setFormData((current) => ({ ...current, icon }))}
            />

            {(createMutation.error || updateMutation.error) && (
              <IonText color="danger">
                <p style={{ padding: '0 16px' }}>Ошибка. Попробуйте ещё раз.</p>
              </IonText>
            )}

            <IonButton
              expand="block"
              style={{ marginTop: '16px' }}
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.name.trim()}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? <IonSpinner name="crescent" />
                : editingId ? 'Сохранить' : 'Создать'
              }
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          cssClass="app-alert"
          isOpen={!!deleteTarget}
          onDidDismiss={() => setDeleteTarget(null)}
          header="Удалить категорию?"
          message={
            deleteTarget?.children?.length
              ? `Категория "${deleteTarget.name}" будет удалена. Её подкатегории останутся и станут корневыми.`
              : `Удалить категорию "${deleteTarget?.name}"?`
          }
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            { text: 'Удалить', role: 'destructive', handler: handleDeleteConfirm },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
