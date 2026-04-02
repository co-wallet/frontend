import { apiClient } from './client'

export interface Currency {
  code: string
  name: string
  symbol?: string
  isActive: boolean
  rateToUsd: number
}

export const currenciesApi = {
  list(codes?: string[]): Promise<Currency[]> {
    const params = codes?.length ? { codes: codes.join(',') } : undefined
    return apiClient.get<Currency[]>('/currencies', { params }).then((r) => r.data)
  },
}
