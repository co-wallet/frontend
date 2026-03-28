import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Copy, Check, Plus } from 'lucide-react'
import { invitesApi, type Invite } from '@/api/invites'

function InviteRow({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false)
  const inviteURL = `${window.location.origin}/invite/${invite.token}`

  const copy = () => {
    navigator.clipboard.writeText(inviteURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUsed = !!invite.usedAt
  const isExpired = !isUsed && new Date(invite.expiresAt) < new Date()

  return (
    <div className="bg-card rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{invite.email}</p>
          <p className="text-xs text-muted-foreground">
            {isUsed
              ? `Использован ${new Date(invite.usedAt!).toLocaleDateString('ru-RU')}`
              : isExpired
                ? 'Истёк срок действия'
                : `Истекает ${new Date(invite.expiresAt).toLocaleDateString('ru-RU')}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isUsed ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Принят</span>
          ) : isExpired ? (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Истёк</span>
          ) : (
            <button
              onClick={copy}
              className="flex items-center gap-1 text-xs border rounded-md px-2 py-1 hover:bg-muted"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied ? 'Скопировано' : 'Ссылка'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminInvitesPage() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [lastInviteURL, setLastInviteURL] = useState<string | null>(null)
  const [apiError, setApiError] = useState('')

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: invitesApi.list,
  })

  const create = useMutation({
    mutationFn: () => invitesApi.create(email),
    onSuccess: ({ inviteUrl }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] })
      setLastInviteURL(inviteUrl)
      setEmail('')
      setShowForm(false)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setApiError(err?.response?.data?.error ?? 'Ошибка')
    },
  })

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground text-sm">← Назад</Link>
            <div className="flex items-center gap-2">
              <Mail size={20} />
              <h1 className="text-xl font-bold">Приглашения</h1>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setLastInviteURL(null); setApiError('') }}
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-md px-3 py-1.5"
          >
            <Plus size={14} /> Пригласить
          </button>
        </div>

        {showForm && (
          <div className="bg-card rounded-lg border p-4 mb-4">
            <h2 className="font-semibold mb-3">Новое приглашение</h2>
            <form
              className="space-y-3"
              onSubmit={(e) => { e.preventDefault(); setApiError(''); create.mutate() }}
            >
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {apiError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{apiError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-md border py-2 text-sm hover:bg-muted"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50"
                >
                  {create.isPending ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        )}

        {lastInviteURL && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-green-800 mb-2">Приглашение создано!</p>
            {/* Check if SMTP is configured by seeing if backend sent email — we don't know, so always show link */}
            <p className="text-xs text-green-700 mb-2">Отправьте эту ссылку пользователю:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 truncate">{lastInviteURL}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(lastInviteURL) }}
                className="shrink-0 p-1.5 rounded-md border hover:bg-white"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        ) : invites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Нет приглашений</div>
        ) : (
          <div className="space-y-2">
            {invites.map((inv: Invite) => <InviteRow key={inv.id} invite={inv} />)}
          </div>
        )}
      </div>
    </div>
  )
}
