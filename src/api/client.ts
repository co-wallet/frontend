import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retryAfterRefresh?: boolean
    _skipAuthRefresh?: boolean
  }

  export interface InternalAxiosRequestConfig {
    _retryAfterRefresh?: boolean
    _skipAuthRefresh?: boolean
  }
}

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && !config._skipAuthRefresh) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshRequest: Promise<string> | null = null

function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post<TokenPair>(
        '/auth/refresh',
        { refreshToken },
        { _skipAuthRefresh: true },
      )
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        return data.accessToken
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

function endSession() {
  useAuthStore.getState().logout()
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config
    const isPublicAuthRequest = config?.url?.startsWith('/auth/') ?? false

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retryAfterRefresh ||
      config._skipAuthRefresh ||
      isPublicAuthRequest
    ) {
      return Promise.reject(error)
    }

    const refreshToken = useAuthStore.getState().refreshToken
    if (!refreshToken) {
      endSession()
      return Promise.reject(error)
    }

    config._retryAfterRefresh = true

    try {
      const accessToken = await refreshAccessToken(refreshToken)
      config.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(config)
    } catch (refreshError) {
      endSession()
      return Promise.reject(refreshError)
    }
  },
)
