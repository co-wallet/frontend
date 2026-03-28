import { apiClient as api } from './client'
import type { Currency } from './currencies'

export interface AdminUser {
  id: string
  username: string
  email: string
  defaultCurrency: string
  isAdmin: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateUserReq {
  isActive?: boolean
  isAdmin?: boolean
  newPassword?: string
}

export interface AdminCurrency extends Currency {
  rateToUsd: number
}

export interface CreateCurrencyReq {
  code: string
  name: string
  symbol?: string
  isActive: boolean
}

export interface UpdateCurrencyReq {
  name?: string
  symbol?: string
  isActive?: boolean
}

export const adminApi = {
  listUsers(): Promise<AdminUser[]> {
    return api.get('/admin/users').then((r) => r.data)
  },
  updateUser(id: string, req: UpdateUserReq): Promise<void> {
    return api.patch(`/admin/users/${id}`, req)
  },
  listCurrencies(): Promise<AdminCurrency[]> {
    return api.get('/admin/currencies').then((r) => r.data)
  },
  createCurrency(req: CreateCurrencyReq): Promise<void> {
    return api.post('/admin/currencies', req)
  },
  updateCurrency(code: string, req: UpdateCurrencyReq): Promise<void> {
    return api.patch(`/admin/currencies/${code}`, req)
  },
  refreshRates(): Promise<void> {
    return api.post('/admin/currencies/rates/refresh')
  },
}
