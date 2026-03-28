import { apiClient } from './client';

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  createdAt: string;
  children: CategoryNode[];
}

export type CategoryNode = Category;

export interface CreateCategoryReq {
  parentId?: string | null;
  name: string;
  type: CategoryType;
  icon?: string | null;
}

export interface UpdateCategoryReq {
  name?: string;
  icon?: string | null;
}

export const categoriesApi = {
  list: (type: CategoryType) =>
    apiClient.get<CategoryNode[]>('/categories', { params: { type } }).then((r: { data: CategoryNode[] }) => r.data),

  create: (req: CreateCategoryReq) =>
    apiClient.post<Category>('/categories', req).then((r: { data: Category }) => r.data),

  update: (id: string, req: UpdateCategoryReq) =>
    apiClient.patch<Category>(`/categories/${id}`, req).then((r: { data: Category }) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}`),
};
