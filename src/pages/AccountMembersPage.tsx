import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2 } from 'lucide-react'
import { accountsApi } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'

export function AccountMembersPage() {
  const { accountID } = useParams<{ accountID: string }>()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [username, setUsername] = useState('')
  const [share, setShare] = useState(0.5)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const { data: account } = useQuery({
    queryKey: ['account', accountID],
    queryFn: () => accountsApi.get(accountID!),
  })

  const { data: members = [] } = useQuery({
    queryKey: ['account-members', accountID],
    queryFn: () => accountsApi.getMembers(accountID!),
  })

  const addMutation = useMutation({
    mutationFn: () => accountsApi.addMember(accountID!, username, share),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-members', accountID] })
      setUsername('')
      setShare(0.5)
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-members', accountID] }),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => accountsApi.removeMember(accountID!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-members', accountID] }),
  })

  const isOwner = account?.ownerId === user?.id

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
                  type="number"
                  value={m.defaultShare}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={!isOwner}
                  onChange={(e) =>
                    updateShareMutation.mutate({ userId: m.userId, newShare: Number(e.target.value) })
                  }
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
                {error && (
                  <p className="mb-2 text-xs text-destructive">{error}</p>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Имя пользователя</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">
                      Доля по умолчанию (0–1)
                    </label>
                    <input
                      type="number"
                      value={share}
                      onChange={(e) => setShare(Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowForm(false); setError('') }}
                      className="flex-1 rounded border py-2 text-sm hover:bg-muted"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => addMutation.mutate()}
                      disabled={addMutation.isPending || !username}
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
