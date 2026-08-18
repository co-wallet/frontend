import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonMenuButton, IonButtons, IonSpinner, IonText,
  IonAlert, IonModal, IonInput, IonButton,
  IonSegment, IonSegmentButton, IonFab, IonFabButton,
  IonSelect, IonSelectOption,
} from '@ionic/react';
import {
  folderOutline, addOutline, createOutline, trashOutline,
  chevronForwardOutline, chevronDownOutline,
} from 'ionicons/icons';
import { categoriesApi, CategoryNode, CategoryType, CreateCategoryReq } from '../api/categories';
import {
  CategoryIcon,
  defaultCategoryIconValue,
  normalizeCategoryIconValue,
} from '../components/CategoryIcon';
import { CategoryIconSettings } from '../components/CategoryIconSettings';

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null);

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

  const createMutation = useMutation({
    mutationFn: (req: CreateCategoryReq) => categoriesApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', activeTab] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, icon }: { id: string; name: string; icon: string }) =>
      categoriesApi.update(id, { name, icon: icon || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', activeTab] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', activeTab] }),
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyFormData(activeTab));
  }

  function handleEdit(cat: CategoryNode) {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      parentId: cat.parentId ?? '',
      icon: normalizeCategoryIconValue(cat.icon, cat.type),
    });
    setShowForm(true);
    if (slidingRef.current) slidingRef.current.close();
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

  const flatList: CategoryNode[] = [];
  function flatten(nodes: CategoryNode[]) {
    for (const n of nodes) {
      flatList.push(n);
      if (n.children?.length) flatten(n.children);
    }
  }
  flatten(categories);

  function renderTree(nodes: CategoryNode[], depth: number) {
    return nodes.map(node => {
      const hasChildren = !!(node.children?.length);
      const isExpanded = expanded.has(node.id);

      return (
        <div key={node.id}>
          <IonItemSliding ref={(el) => { slidingRef.current = el }}>
            <IonItem
              style={{ '--padding-start': `${16 + depth * 20}px` } as React.CSSProperties}
              onClick={hasChildren ? () => toggleExpand(node.id) : undefined}
              button={hasChildren}
            >
              {hasChildren && (
                <IonIcon
                  icon={isExpanded ? chevronDownOutline : chevronForwardOutline}
                  slot="start"
                  style={{ fontSize: '14px', marginRight: '4px' }}
                />
              )}
              {!hasChildren && (
                <span slot="start" style={{ width: '18px' }} />
              )}
              <span slot="start" style={{ marginRight: '8px' }}>
                <CategoryIcon value={node.icon} type={node.type} size={32} />
              </span>
              <IonLabel>{node.name}</IonLabel>
            </IonItem>
            <IonItemOptions side="end">
              <IonItemOption color="primary" onClick={() => handleEdit(node)}>
                <IonIcon slot="icon-only" icon={createOutline} />
              </IonItemOption>
              <IonItemOption
                color="danger"
                onClick={() => {
                  setDeleteTarget({ id: node.id, name: node.name });
                  if (slidingRef.current) slidingRef.current.close();
                }}
              >
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
          {hasChildren && isExpanded && renderTree(node.children, depth + 1)}
        </div>
      );
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
            {renderTree(categories, 0)}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setEditingId(null); setFormData(emptyFormData(activeTab)); setShowForm(true); }}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Add/Edit Modal */}
        <IonModal isOpen={showForm} onDidDismiss={resetForm}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingId ? 'Изменить категорию' : 'Новая категория'}</IonTitle>
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
              {!editingId && (
                <IonItem>
                  <IonSelect
                    label="Родительская категория"
                    labelPlacement="floating"
                    value={formData.parentId || undefined}
                    onIonChange={e => setFormData(f => ({ ...f, parentId: e.detail.value ?? '' }))}
                    placeholder="Без родительской"
                  >
                    <IonSelectOption value="">Без родительской</IonSelectOption>
                    {flatList.map(c => (
                      <IonSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
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
          isOpen={!!deleteTarget}
          onDidDismiss={() => setDeleteTarget(null)}
          header="Удалить категорию?"
          message={`Удалить категорию "${deleteTarget?.name}"?`}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            { text: 'Удалить', role: 'destructive', handler: handleDeleteConfirm },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
