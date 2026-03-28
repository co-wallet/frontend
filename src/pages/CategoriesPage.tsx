import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, CategoryNode, CategoryType, CreateCategoryReq } from '../api/categories';

const EXPENSE_ICONS = [
  '🛒', '🍔', '🍕', '☕', '🍺', '🍽️',
  '🚗', '⛽', '🚌', '✈️', '🚕', '🚂',
  '🏠', '💡', '📱', '💻', '🛠️', '🧹',
  '👗', '👟', '💄', '🛍️', '👒', '⌚',
  '💊', '🏥', '💉', '🧴', '🦷', '👓',
  '🎬', '🎮', '🎵', '📚', '🏋️', '⚽',
  '🐾', '🌿', '🎁', '✂️', '🧺', '📦',
]

const INCOME_ICONS = [
  '💼', '💰', '💵', '💳', '📈', '🏦',
  '🤝', '🎓', '👔', '🏢', '💹', '🪙',
  '🏡', '🚀', '🎯', '🎪', '🎁', '🏆',
]

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; parentId: string; icon: string }>({
    name: '',
    parentId: '',
    icon: '',
  });

  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', activeTab],
    queryFn: () => categoriesApi.list(activeTab),
  });

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
    setFormData({ name: '', parentId: '', icon: '' });
  }

  function handleEdit(cat: CategoryNode) {
    setEditingId(cat.id);
    setFormData({ name: cat.name, parentId: cat.parentId ?? '', icon: cat.icon ?? '' });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  // Collect all categories in a flat list for parent select
  const flatList: CategoryNode[] = [];
  function flatten(nodes: CategoryNode[]) {
    for (const n of nodes) {
      flatList.push(n);
      if (n.children?.length) flatten(n.children);
    }
  }
  flatten(categories);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Категории</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Добавить
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
          {(['expense', 'income'] as CategoryType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'expense' ? 'Расходы' : 'Доходы'}
            </button>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">
              {editingId ? 'Изменить категорию' : 'Новая категория'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Название"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Иконка</p>
                <div className="flex flex-wrap gap-1.5">
                  {(activeTab === 'expense' ? EXPENSE_ICONS : INCOME_ICONS).map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, icon: f.icon === icon ? '' : icon }))}
                      className={`w-9 h-9 rounded-lg border text-xl flex items-center justify-center transition-colors ${
                        formData.icon === icon
                          ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              {!editingId && (
                <select
                  value={formData.parentId}
                  onChange={e => setFormData(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Без родительской категории</option>
                  {flatList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </option>
                  ))}
                </select>
              )}
              {(createMutation.error || updateMutation.error) && (
                <p className="text-red-500 text-sm">Ошибка. Попробуйте ещё раз.</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingId ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category tree */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Нет категорий. Создайте первую!
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => (
              <CategoryItem
                key={cat.id}
                node={cat}
                depth={0}
                onEdit={handleEdit}
                onDelete={id => {
                  if (confirm('Удалить категорию?')) deleteMutation.mutate(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryItem({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  depth: number;
  onEdit: (cat: CategoryNode) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div
        className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center gap-2">
          {node.icon && <span className="text-xl">{node.icon}</span>}
          <span className="font-medium text-gray-900">{node.name}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(node)}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
          >
            Изменить
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
          >
            Удалить
          </button>
        </div>
      </div>
      {node.children?.map((child: CategoryNode) => (
        <CategoryItem
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
