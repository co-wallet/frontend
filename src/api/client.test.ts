import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './client'
import { useAuthStore } from '@/store/authStore'
import type { User } from './auth'

vi.hoisted(() => {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: storage,
      location: {
        pathname: '/login',
        assign: (path: string) => {
          globalThis.window.location.pathname = path
        },
      },
    },
  })
})

const user: User = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  defaultCurrency: 'USD',
  isAdmin: false,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function response<T>(config: InternalAxiosRequestConfig, status: number, data: T): AxiosResponse<T> {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: String(status),
  }
}

function unauthorized(config: InternalAxiosRequestConfig): never {
  const res = response(config, 401, { error: 'unauthorized' })
  throw new AxiosError('unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, res)
}

describe('apiClient auth refresh', () => {
  const originalAdapter = apiClient.defaults.adapter

  beforeEach(() => {
    window.location.pathname = '/login'
    useAuthStore.getState().setAuth('expired-access', 'refresh-old', user)
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    useAuthStore.getState().logout()
    window.localStorage.clear()
  })

  it('refreshes tokens and retries the original request once', async () => {
    let protectedCalls = 0
    let refreshCalls = 0

    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1
        expect(JSON.parse(String(config.data))).toEqual({ refreshToken: 'refresh-old' })
        return response(config, 200, {
          accessToken: 'access-new',
          refreshToken: 'refresh-new',
        })
      }

      if (config.url === '/protected') {
        protectedCalls += 1
        if (protectedCalls === 1) unauthorized(config)
        expect(config.headers.Authorization).toBe('Bearer access-new')
        return response(config, 200, { ok: true })
      }

      throw new Error(`unexpected request: ${config.url}`)
    }

    const { data } = await apiClient.get<{ ok: boolean }>('/protected')

    expect(data).toEqual({ ok: true })
    expect(protectedCalls).toBe(2)
    expect(refreshCalls).toBe(1)
    expect(useAuthStore.getState().token).toBe('access-new')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-new')
  })

  it('logs out when the refresh token is rejected', async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') unauthorized(config)
      if (config.url === '/protected') unauthorized(config)
      throw new Error(`unexpected request: ${config.url}`)
    }

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(AxiosError)

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('does not attempt refresh for public auth requests', async () => {
    let calls = 0
    apiClient.defaults.adapter = async (config) => {
      calls += 1
      unauthorized(config)
    }

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError)
    expect(calls).toBe(1)
  })
})
