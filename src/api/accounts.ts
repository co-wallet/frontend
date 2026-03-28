import { apiClient } from './client'

export type AccountType = 'personal' | 'shared'

export interface AccountMember {
  accountId: string
  userId: string
  username: string
  defaultShare: number
}

export interface AccountBalance {
  native: number           // user's share in account's currency
  display: number          // user's share in display currency
  totalNative: number      // all-member total in account's currency
  totalDisplay: number     // all-member total in display currency
  displayCurrency: string
}

export interface Account {
  id: string
  ownerId: string
  name: string
  type: AccountType
  currency: string
  icon: string | null
  includeInBalance: boolean
  initialBalance: number
  initialBalanceDate: string | null
  members?: AccountMember[]
  balance?: AccountBalance
  createdAt: string
  updatedAt: string
}

export interface CreateAccountDto {
  name: string
  type: AccountType
  currency: string
  icon?: string
  includeInBalance?: boolean
  initialBalance?: number
  initialBalanceDate?: string
}

export interface UpdateAccountDto {
  name?: string
  icon?: string | null
  includeInBalance?: boolean
}

export const accountsApi = {
  list: async (currency?: string): Promise<Account[]> => {
    const { data } = await apiClient.get<Account[]>('/accounts', {
      params: currency ? { currency } : {},
    })
    return data
  },

  get: async (id: string): Promise<Account> => {
    const { data } = await apiClient.get<Account>(`/accounts/${id}`)
    return data
  },

  create: async (dto: CreateAccountDto): Promise<Account> => {
    const { data } = await apiClient.post<Account>('/accounts', dto)
    return data
  },

  update: async (id: string, dto: UpdateAccountDto): Promise<Account> => {
    const { data } = await apiClient.patch<Account>(`/accounts/${id}`, dto)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`)
  },

  getMembers: async (accountId: string): Promise<AccountMember[]> => {
    const { data } = await apiClient.get<AccountMember[]>(`/accounts/${accountId}/members`)
    return data
  },

  addMember: async (accountId: string, username: string, defaultShare: number): Promise<AccountMember[]> => {
    const { data } = await apiClient.post<AccountMember[]>(`/accounts/${accountId}/members`, {
      username,
      defaultShare,
    })
    return data
  },

  updateMember: async (accountId: string, userId: string, defaultShare: number): Promise<AccountMember[]> => {
    const { data } = await apiClient.patch<AccountMember[]>(
      `/accounts/${accountId}/members/${userId}`,
      { defaultShare },
    )
    return data
  },

  removeMember: async (accountId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/accounts/${accountId}/members/${userId}`)
  },
}
