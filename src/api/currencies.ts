import { apiClient } from './client'

export interface Currency {
  code: string
  name: string
  symbol?: string
  isActive: boolean
  rateToUsd: number
}

export const currenciesApi = {
  list(): Promise<Currency[]> {
    return apiClient.get<Currency[]>('/currencies').then((r) => r.data)
  },
}
