import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Pencil, Trash2, Check, X } from 'lucide-react'
import { accountsApi } from '@/api/accounts'
import { useAuthStore } from '@/store/authStore'

export function AccountDetailPage() {
  const { accountID } = useParams<{ accountID: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editInclude, setEditInclude] = useState(true)

  const { data: account, isLoading } = useQuery({
    queryKey: ['account', accountID],
    queryFn: () => accountsApi.get(accountID!),
  })

  const updateMutation = useMutation({
    mutationFn: () => accountsApi.update(accountID!, { name: editName, includeInBalance: editInclude }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', accountID] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => accountsApi.delete(accountID!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      navigate('/accounts')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Счёт не найден</p>
      </div>
    )
  }

  const isOwner = account.ownerId === user?.id

  const startEdit = () => {
    setEditName(account.name)
    setEditInclude(account.includeInBalance)
    setEditing(true)
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/accounts" className="text-muted-foreground hover:text-foreground text-sm">
            ← Счета
          </Link>
        </div>

        <div className="bg-card rounded-lg border p-4 mb-4">
          {editing ? (
            <div className="space-y-3">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editInclude}
                  onChange={(e) => setEditInclude(e.target.checked)}
                />
                Учитывать в балансе
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-muted"
                >
                  <X size={14} /> Отмена
                </button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
                >
                  <Check size={14} /> Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{account.icon ?? '💳'}</span>
                <div>
                  <h1 className="text-lg font-bold">{account.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {account.type === 'shared' ? 'Совместный' : 'Личный'} · {account.currency}
                  </p>
                  {!account.includeInBalance && (
                    <p className="text-xs text-muted-foreground">Не учитывается в балансе</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={startEdit}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <Pencil size={16} />
                </button>
                {isOwner && (
                  <button
                    onClick={() => {
                      if (confirm('Удалить счёт?')) deleteMutation.mutate()
                    }}
                    className="p-1.5 rounded hover:bg-muted text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {account.type === 'shared' && (
          <Link
            to={`/accounts/${accountID}/members`}
            className="flex items-center gap-3 bg-card rounded-lg border p-3 mb-4 hover:bg-muted"
          >
            <Users size={18} className="text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Участники</p>
              {account.members && (
                <p className="text-xs text-muted-foreground">
                  {account.members.length} чел.
                </p>
              )}
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
        )}

        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Транзакции</p>
          <p className="text-xs text-muted-foreground mt-2">— появятся в следующей фазе —</p>
        </div>
      </div>
    </div>
  )
}
