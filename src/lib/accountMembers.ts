import type { CreateAccountMemberDto } from '@/api/accounts'

export const ACCOUNT_CONFIGURATION_NOTE = 'Режим, участники и доли задаются при создании и больше не меняются. Для другого состава или распределения создайте новый счёт и переведите на него средства.'
export interface MemberDraft { username: string; share: string }

export function buildAccountMembers(drafts: MemberDraft[], owner: string): { members: CreateAccountMemberDto[]; error?: string } {
  const members: CreateAccountMemberDto[] = []
  const seen = new Set<string>()
  let total = 0
  for (const draft of drafts) {
    const username = draft.username.trim()
    const value = draft.share.replace(',', '.')
    if (!username || seen.has(username)) return { members: [], error: 'Выберите разных участников.' }
    if (!/^\d+(\.\d{1,4})?$/.test(value) || Number(value) > 1) return { members: [], error: 'Доля должна быть от 0 до 1, не более четырёх знаков после запятой.' }
    seen.add(username)
    total += Math.round(Number(value) * 10000)
    members.push({ username, defaultShare: Number(value) })
  }
  if (!seen.has(owner) || total !== 10000) return { members: [], error: 'Укажите владельца и распределите ровно 100% (сумма долей — 1).' }
  return { members }
}
