import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './client'
import { accountsApi, type Account } from './accounts'

vi.mock('./client', () => ({
  apiClient: {
    patch: vi.fn(),
    get: vi.fn(),
  },
}))

const account: Account = {
  id: 'account-1',
  ownerId: 'user-1',
  name: 'Семейный',
  accessMode: 'shared',
  kind: 'spending',
  currency: 'RUB',
  icon: 'preset:shared|purple|orange',
  initialBalance: 1500,
  initialBalanceDate: '2026-08-18T00:00:00Z',
  createdAt: '2026-08-18T00:00:00Z',
  updatedAt: '2026-08-18T00:00:00Z',
}

describe('accountsApi.update', () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockReset()
  })

  it('sends access mode together with editable appearance and balance fields', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: account })

    const dto = {
      name: 'Семейный',
      accessMode: 'shared' as const,
      icon: 'preset:shared|purple|orange',
      initialBalance: 1500,
      initialBalanceDate: '2026-08-18',
    }

    await expect(accountsApi.update('account-1', dto)).resolves.toEqual(account)
    expect(apiClient.patch).toHaveBeenCalledWith('/accounts/account-1', dto)
  })
})

it('looks up transfer destinations by exact username using a separate endpoint', async () => {
  const destination = { id: 'dest', name: 'Получатель', currency: 'EUR', icon: null }
  vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [destination] })
  await expect(accountsApi.transferAccounts('alice')).resolves.toEqual([destination])
  expect(apiClient.get).toHaveBeenCalledWith('/transfer-accounts', { params: { username: 'alice' } })
})
it('propagates transfer lookup errors', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('offline'))
  await expect(accountsApi.transferAccounts('alice')).rejects.toThrow('offline')
})
it('saves transfer acceptance explicitly, including disabling it', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: account })
  await accountsApi.update('account-1', { acceptTransfers: false })
  expect(apiClient.patch).toHaveBeenCalledWith('/accounts/account-1', { acceptTransfers: false })
})
