import { describe, expect, it, vi } from 'vitest'
import { authApi } from './auth'
import { apiClient } from './client'
vi.mock('./client', () => ({ apiClient: { patch: vi.fn() } }))
describe('authApi.updateMe', () => {
  it('sends profile and password fields without a user id', async () => {
    const user = { id: 'u1', username: 'alice', email: 'new@test.com' }
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: user })
    const request = { username: 'alice', email: 'new@test.com', currentPassword: 'old-password', newPassword: 'new-password' }
    await expect(authApi.updateMe(request)).resolves.toEqual(user)
    expect(apiClient.patch).toHaveBeenLastCalledWith('/users/me', request)
  })
  it('preserves the existing currency call', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} })
    await authApi.updateMe('EUR')
    expect(apiClient.patch).toHaveBeenLastCalledWith('/users/me', { defaultCurrency: 'EUR' })
  })
  it('propagates validation and conflict errors', async () => {
    const error = { response: { status: 409, data: { error: 'taken' } } }
    vi.mocked(apiClient.patch).mockRejectedValueOnce(error)
    await expect(authApi.updateMe({ username: 'taken' })).rejects.toBe(error)
  })
})
