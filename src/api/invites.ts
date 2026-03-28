import axios from 'axios'
import { apiClient } from './client'
import type { User } from './auth'
import type { TokenPair } from './auth'

export interface Invite {
  id: string
  email: string
  token: string
  createdBy: string
  usedAt?: string
  expiresAt: string
  createdAt: string
}

export interface CreateInviteResponse {
  invite: Invite
  inviteUrl: string
}

export interface AcceptInviteResponse {
  user: User
  tokens: TokenPair
}

export const invitesApi = {
  // admin
  list(): Promise<Invite[]> {
    return apiClient.get('/admin/invites').then((r) => r.data)
  },
  create(email: string): Promise<CreateInviteResponse> {
    return apiClient.post('/admin/invites', { email }).then((r) => r.data)
  },
  // public (no auth)
  validate(token: string): Promise<{ email: string }> {
    return axios.get(`/api/invites/${token}`).then((r) => r.data)
  },
  accept(token: string, username: string, password: string, defaultCurrency: string): Promise<AcceptInviteResponse> {
    return axios
      .post(`/api/invites/${token}/accept`, { username, password, defaultCurrency })
      .then((r) => r.data)
  },
}
