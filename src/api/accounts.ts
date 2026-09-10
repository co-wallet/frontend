import { apiClient } from './client'

export type AccountAccessMode = 'personal' | 'shared'
export type AccountKind = 'spending' | 'savings' | 'deposit' | 'savings_account' | 'investment'

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
  acceptTransfers?: boolean
  id: string
  ownerId: string
  name: string
  accessMode: AccountAccessMode
  kind: AccountKind
  currency: string
  icon: string | null
  initialBalance: number
  initialBalanceDate: string
  members?: AccountMember[]
  balance?: AccountBalance
  createdAt: string
  updatedAt: string
}

export interface CreateAccountMemberDto {
  username: string
  defaultShare: number
}

export interface CreateAccountDto {
  members?: CreateAccountMemberDto[]
  acceptTransfers?: boolean
  name: string
  accessMode: AccountAccessMode
  kind: AccountKind
  currency: string
  icon?: string
  initialBalance?: number
  initialBalanceDate: string
}

export interface UpdateAccountDto {
  acceptTransfers?: boolean
  name?: string
  icon?: string | null
  initialBalance?: number
  initialBalanceDate?: string
}

export type TransferAccount = Pick<Account, 'id' | 'name' | 'icon' | 'currency'>

export const accountsApi = {
  transferAccounts: async (username: string): Promise<TransferAccount[]> => {
    const { data } = await apiClient.get<TransferAccount[]>('/transfer-accounts', { params: { username } })
    return data
  },
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

}
