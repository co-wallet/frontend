import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './client'
import { transactionsApi } from './transactions'

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('transactionsApi.list', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
  })

  it('serializes the without-tags filter', async () => {
    await transactionsApi.list({ withoutTags: true, page: 1, limit: 50 })

    expect(apiClient.get).toHaveBeenCalledWith('/transactions', {
      params: { without_tags: 'true', page: '1', limit: '50' },
    })
  })
})
