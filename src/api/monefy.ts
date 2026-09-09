import { apiClient } from './client'
import type { AccountKind } from './accounts'

export interface ImportAvailability { available: boolean; reasons: string[] }
export type ImportMode = 'empty' | 'replace'
export interface ImportReplacement {
  accounts: { id: string; name: string; currency: string; deleted_at: string | null }[]
  counts: Record<string, number>
  blockers: Record<string, number>
}
export interface ImportPreview {
  mode?: ImportMode
  replacement?: ImportReplacement
  preview_id: string
  expires_at: string
  can_confirm: boolean
  requires_exclusion_confirmation: boolean
  counts: Record<string, number>
  period_from: string | null
  period_to: string | null
  currencies: string[]
  accounts: { source_id: string; icon: string; name: string; currency: string; kind: AccountKind | ''; initial_balance: string; initial_balance_date: string; final_balance: string; source_included_in_total: boolean; source_disabled_at: string | null }[]
  categories: { source_id: string; existing_id?: string; name: string; type: 'expense' | 'income'; icon: string; source_disabled_at: string | null }[]
  diagnostics: { severity: string; code: string; entity: string; source_id: string; message: string }[]
  exclusions: { entity: string; source_id: string; reason: string }[]
  deleted: Record<string, number> | null
}
export interface ImportResult {
  preview_id: string; accounts: number; categories: number; reused_categories: number
  transactions: number; transfers: number; completed_at: string
}
const base = '/imports/monefy'
export const monefyApi = {
  availability: async () => (await apiClient.get<ImportAvailability>(`${base}/availability`)).data,
  preview: async (file: File, mode: ImportMode = 'empty') => (await apiClient.post<ImportPreview>(`${base}/preview${mode === 'replace' ? '?mode=replace' : ''}`, file, { headers: { 'Content-Type': 'application/octet-stream' }, timeout: 30000 })).data,
  configure: async (id: string, kinds: Record<string, AccountKind>, categoryIcons: Record<string, string> = {}, accountIcons: Record<string, string> = {}) => (await apiClient.post<ImportPreview>(`${base}/${encodeURIComponent(id)}/options`, { account_kinds: kinds, category_icons: categoryIcons, account_icons: accountIcons })).data,
  confirm: async (id: string, accepted: boolean, deletion = false) => (await apiClient.post<ImportResult>(`${base}/${encodeURIComponent(id)}/confirm`, { acknowledge_exclusions: accepted, acknowledge_deletion: deletion }, { timeout: 30000 })).data,
}
