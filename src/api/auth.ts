import { apiClient } from './client'

export interface User {
  id: string
  username: string
  email: string
  defaultCurrency: string
  isAdmin: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  tokens: TokenPair
}

export interface UserSummary {
  id: string
  username: string
  email: string
}

export const authApi = {
  register: async (username: string, email: string, password: string): Promise<User> => {
    const { data } = await apiClient.post<User>('/auth/register', { username, email, password })
    return data
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    return data
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await apiClient.post<TokenPair>('/auth/refresh', { refreshToken })
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/users/me')
    return data
  },

  listUsers: async (): Promise<UserSummary[]> => {
    const { data } = await apiClient.get<UserSummary[]>('/users')
    return data
  },

  updateMe: async (defaultCurrency: string): Promise<User> => {
    const { data } = await apiClient.patch<User>('/users/me', { defaultCurrency })
    return data
  },
}
