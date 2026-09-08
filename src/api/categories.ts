import { apiClient } from './client';

export type CategoryType = 'expense' | 'income';

export interface Category {
  hidden?: boolean;
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  createdAt: string;
}


export interface CreateCategoryReq {
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
    apiClient.get<Category[]>('/categories', { params: { type } }).then((r: { data: Category[] }) => r.data),

  create: (req: CreateCategoryReq) =>
    apiClient.post<Category>('/categories', req).then((r: { data: Category }) => r.data),

  update: (id: string, req: UpdateCategoryReq) =>
    apiClient.patch<Category>(`/categories/${id}`, req).then((r: { data: Category }) => r.data),

  setHidden: (id: string, hidden: boolean) =>
    apiClient.put(`/categories/${id}/visibility`, { hidden }),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}`),
};
