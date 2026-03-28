import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, ShieldOff, KeyRound, Users } from 'lucide-react'
import { adminApi, type AdminUser } from '@/api/admin'
import { cn } from '@/lib/utils'

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: AdminUser
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, { newPassword: password }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); onClose() },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg border p-5 w-80">
        <h3 className="font-semibold mb-3">Сброс пароля — {user.username}</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Новый пароль"
          className="w-full rounded-md border px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border py-2 text-sm hover:bg-muted"
          >
            Отмена
          </button>
          <button
            disabled={password.length < 4 || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateUser(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const toggleAdmin = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      adminApi.updateUser(id, { isAdmin }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground text-sm">
            ← Назад
          </Link>
          <div className="flex items-center gap-2">
            <Users size={20} />
            <h1 className="text-xl font-bold">Пользователи</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-card rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{u.username}</span>
                      {u.isAdmin && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          admin
                        </span>
                      )}
                      {!u.isActive && (
                        <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                          заблокирован
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.defaultCurrency} · {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title={u.isActive ? 'Заблокировать' : 'Разблокировать'}
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      className={cn(
                        'p-1.5 rounded-md hover:bg-muted',
                        u.isActive ? 'text-muted-foreground' : 'text-destructive',
                      )}
                    >
                      {u.isActive ? <ShieldOff size={16} /> : <Shield size={16} />}
                    </button>
                    <button
                      title={u.isAdmin ? 'Снять права админа' : 'Назначить админом'}
                      onClick={() => toggleAdmin.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                      className={cn(
                        'p-1.5 rounded-md hover:bg-muted',
                        u.isAdmin ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      <Shield size={16} />
                    </button>
                    <button
                      title="Сбросить пароль"
                      onClick={() => setResetUser(u)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                    >
                      <KeyRound size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  )
}
