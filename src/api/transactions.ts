import { apiClient } from './client'

export type TransactionType = 'expense' | 'income' | 'transfer'

export interface TransactionShare {
  userId: string
  amount: number
  isCustom: boolean
}

export interface TransactionTag {
  id: string
  name: string
}

export interface Transaction {
  id: string
  accountId: string
  toAccountId: string | null
  type: TransactionType
  amount: number
  currency: string
  exchangeRate: number | null
  defaultCurrency: string | null
  defaultCurrencyAmount: number | null
  categoryId: string | null
  description: string | null
  date: string
  includeInBalance: boolean
  createdBy: string
  createdAt: string
  shares: TransactionShare[]
  tags: TransactionTag[]
}

export interface CreateTransactionDto {
  accountId: string
  toAccountId?: string
  type: TransactionType
  amount: number
  currency: string
  defaultCurrency?: string
  defaultCurrencyAmount?: number
  categoryId?: string | null
  description?: string | null
  date: string
  includeInBalance: boolean
  shares?: { userId: string; amount: number }[]
  tags?: string[]
}

export interface UpdateTransactionDto {
  amount?: number
  defaultCurrencyAmount?: number | null
  categoryId?: string | null
  description?: string | null
  date?: string
  includeInBalance?: boolean
  shares?: { userId: string; amount: number }[]
  tags?: string[]
}

export interface TransactionFilter {
  accountIds?: string[]
  categoryIds?: string[]
  tagIds?: string[]
  tagMode?: 'or' | 'and'
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export const transactionsApi = {
  list: async (filter: TransactionFilter = {}): Promise<Transaction[]> => {
    const params: Record<string, string> = {}
    if (filter.accountIds?.length) params.account_ids = filter.accountIds.join(',')
    if (filter.categoryIds?.length) params.category_ids = filter.categoryIds.join(',')
    if (filter.tagIds?.length) params.tag_ids = filter.tagIds.join(',')
    if (filter.tagMode === 'and') params.tag_mode = 'and'
    if (filter.dateFrom) params.date_from = filter.dateFrom
    if (filter.dateTo) params.date_to = filter.dateTo
    if (filter.page) params.page = String(filter.page)
    if (filter.limit) params.limit = String(filter.limit)
    const { data } = await apiClient.get<Transaction[]>('/transactions', { params })
    return data
  },

  get: async (id: string): Promise<Transaction> => {
    const { data } = await apiClient.get<Transaction>(`/transactions/${id}`)
    return data
  },

  create: async (dto: CreateTransactionDto): Promise<Transaction> => {
    const { data } = await apiClient.post<Transaction>('/transactions', dto)
    return data
  },

  update: async (id: string, dto: UpdateTransactionDto): Promise<Transaction> => {
    const { data } = await apiClient.patch<Transaction>(`/transactions/${id}`, dto)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`)
  },
}
