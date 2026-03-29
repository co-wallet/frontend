import { useState, useMemo, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2 } from 'lucide-react'
import { accountsApi } from '@/api/accounts'
import { authApi, type UserSummary } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { parseDecimal, filterDecimalInput } from '@/lib/utils'

export function AccountMembersPage() {
  const { accountID } = useParams<{ accountID: string }>()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const [search, setSearch] = useState('')
  const [share, setShare] = useState('0.5')
  const [showForm, setShowForm] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState('')
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({})

  const { data: account } = useQuery({
    queryKey: ['account', accountID],
    queryFn: () => accountsApi.get(accountID!),
  })

  const { data: members = [] } = useQuery({
    queryKey: ['account-members', accountID],
    queryFn: () => accountsApi.getMembers(accountID!),
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.listUsers,
    staleTime: 60_000,
  })

  // Sync server share values into local input state
  useEffect(() => {
    setShareInputs((prev) => {
      const next = { ...prev }
      members.forEach((m) => {
        if (!(m.userId in next)) next[m.userId] = String(m.defaultShare)
      })
      return next
    })
  }, [members])

  // Exclude users already in the account
  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members])
  const availableUsers = useMemo(
    () => allUsers.filter((u) => !memberIds.has(u.id)),
    [allUsers, memberIds],
  )
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? availableUsers.filter(
          (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
        )
      : availableUsers
  }, [availableUsers, search])

  function recalcOtherShares(
    changedUserId: string,
    newVal: string,
    currentInputs: Record<string, string>,
    allMembers: typeof members,
  ): Record<string, string> {
    const newShare = parseDecimal(newVal)
    const others = allMembers.filter((m) => m.userId !== changedUserId)
    const othersSum = others.reduce(
      (s, m) => s + parseDecimal(currentInputs[m.userId] ?? String(m.defaultShare)),
      0,
    )
    const remaining = Math.max(0, 1 - newShare)
    const next: Record<string, string> = { ...currentInputs, [changedUserId]: newVal }
    if (others.length === 0) return next
    if (othersSum > 0.0001) {
      others.forEach((m) => {
        const cur = parseDecimal(currentInputs[m.userId] ?? String(m.defaultShare))
        next[m.userId] = String(Math.round((cur * remaining / othersSum) * 10000) / 10000)
      })
    } else {
      const each = Math.round((remaining / others.length) * 10000) / 10000
      others.forEach((m) => { next[m.userId] = String(each) })
    }
    return next
  }

  const addMutation = useMutation({
    mutationFn: () => accountsApi.addMember(accountID!, selectedUser!.username, parseDecimal(share)),
    onSuccess: async () => {
      const newMemberShare = parseDecimal(share)
      const remaining = 1 - newMemberShare
      const existingTotal = members.reduce((s, m) => s + m.defaultShare, 0)
      if (members.length > 0 && existingTotal > 0.0001) {
        await Promise.all(
          members.map((m) => {
            const updated = Math.round((m.defaultShare * remaining / existingTotal) * 10000) / 10000
            return accountsApi.updateMember(accountID!, m.userId, updated)
          }),
        )
      }
      qc.invalidateQueries({ queryKey: ['account-members', accountID] })
      setSelectedUser(null)
      setSearch('')
      setShare('0.5')
      setShowForm(false)
      setError('')
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      setError(e.response?.data?.error ?? 'Ошибка')
    },
  })

  const updateShareMutation = useMutation({
    mutationFn: ({ userId, newShare }: { userId: string; newShare: number }) =>
      accountsApi.updateMember(accountID!, userId, newShare),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-members', accountID] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => accountsApi.removeMember(accountID!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-members', accountID] }),
  })

  const isOwner = account?.ownerId === currentUser?.id

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Link to={`/accounts/${accountID}`} className="text-muted-foreground hover:text-foreground text-sm">
            ← Назад
          </Link>
          <h1 className="text-xl font-bold">Участники</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Счёт: <span className="font-medium text-foreground">{account?.name}</span>
        </p>

        <div className="space-y-2 mb-4">
          {members.map((m) => (
            <div key={m.userId} className="bg-card rounded-lg border p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-sm">{m.username}</p>
                {account?.ownerId === m.userId && (
                  <p className="text-xs text-muted-foreground">Владелец</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={shareInputs[m.userId] ?? String(m.defaultShare)}
                  disabled={!isOwner}
                  onChange={(e) => {
                    const newVal = filterDecimalInput(e.target.value)
                    setShareInputs((prev) => recalcOtherShares(m.userId, newVal, prev, members))
                  }}
                  onBlur={() => {
                    const changed = members.filter((member) => {
                      const input = parseDecimal(shareInputs[member.userId] ?? String(member.defaultShare))
                      return Math.abs(input - member.defaultShare) > 0.0001
                    })
                    changed.forEach((member) => {
                      updateShareMutation.mutate({
                        userId: member.userId,
                        newShare: parseDecimal(shareInputs[member.userId] ?? String(member.defaultShare)),
                      })
                    })
                  }}
                  className="w-16 rounded border px-2 py-1 text-sm text-center disabled:opacity-60"
                />
                {isOwner && account?.ownerId !== m.userId && (
                  <button
                    onClick={() => {
                      if (confirm(`Удалить ${m.username}?`)) removeMutation.mutate(m.userId)
                    }}
                    className="p-1.5 rounded text-destructive hover:bg-muted"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isOwner && (
          <>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
              >
                <UserPlus size={16} /> Добавить участника
              </button>
            ) : (
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-medium mb-3 text-sm">Добавить участника</h3>
                {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
                <div className="space-y-3">

                  {/* User picker */}
                  <div>
                    <label className="text-xs font-medium block mb-1">Пользователь</label>
                    <div className="relative">
                      <input
                        value={selectedUser ? `${selectedUser.username} (${selectedUser.email})` : search}
                        onChange={(e) => {
                          setSearch(e.target.value)
                          setSelectedUser(null)
                          setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Поиск по имени или email..."
                        className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                      {showDropdown && !selectedUser && filteredUsers.length > 0 && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowDropdown(false)}
                          />
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredUsers.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u)
                                  setSearch('')
                                  setShowDropdown(false)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                              >
                                <span className="font-medium">{u.username}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {showDropdown && !selectedUser && search && filteredUsers.length === 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground">
                          Пользователи не найдены
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">
                      Доля по умолчанию (0–1)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={share}
                      onChange={(e) => setShare(filterDecimalInput(e.target.value))}
                      className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowForm(false); setError(''); setSelectedUser(null); setSearch('') }}
                      className="flex-1 rounded border py-2 text-sm hover:bg-muted"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => addMutation.mutate()}
                      disabled={addMutation.isPending || !selectedUser}
                      className="flex-1 rounded bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50"
                    >
                      {addMutation.isPending ? 'Добавление...' : 'Добавить'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
