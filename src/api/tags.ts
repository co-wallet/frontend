import { apiClient } from './client'

export interface Tag {
  hidden?: boolean
  id: string
  name: string
  txCount?: number
}

export const tagsApi = {
  list: async (q?: string): Promise<Tag[]> => {
    const { data } = await apiClient.get<Tag[]>('/tags', { params: q ? { q } : {} })
    return data
  },

  create: async (name: string): Promise<Tag> => {
    const { data } = await apiClient.post<Tag>('/tags', { name })
    return data
  },

  setHidden: async (id: string, hidden: boolean): Promise<void> => {
    await apiClient.put(`/tags/${id}/visibility`, { hidden })
  },

  rename: async (id: string, name: string): Promise<Tag> => {
    const { data } = await apiClient.patch<Tag>(`/tags/${id}`, { name })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tags/${id}`)
  },
}
