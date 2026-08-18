import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './client'
import { accountsApi, type Account } from './accounts'

vi.mock('./client', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}))

const account: Account = {
  id: 'account-1',
  ownerId: 'user-1',
  name: 'Семейный',
  accessMode: 'shared',
  kind: 'current',
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
